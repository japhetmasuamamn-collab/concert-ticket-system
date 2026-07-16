import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from . import models, schemas
import pytz

# Outil pour crypter et vérifier les mots de passe des agents
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

tz_local = pytz.timezone("Africa/Lubumbashi")

# ==========================================
# GESTION DES AGENTS (UTILISATEURS)
# ==========================================

def get_utilisateur_par_telephone(db: Session, telephone: str):
    return db.query(models.Utilisateur).filter(models.Utilisateur.telephone == telephone).first()

def creer_utilisateur(db: Session, utilisateur: schemas.UtilisateurCreate):
    # Crypter le mot de passe avant de l'enregistrer
    mot_de_passe_crypte = pwd_context.hash(utilisateur.mot_de_passe)
    
    db_utilisateur = models.Utilisateur(
        nom=utilisateur.nom,
        telephone=utilisateur.telephone,
        mot_de_passe=mot_de_passe_crypte,
        role=utilisateur.role
    )
    db.add(db_utilisateur)
    db.commit()
    db.refresh(db_utilisateur)
    return db_utilisateur


# ==========================================
# GESTION DES TYPES DE BILLETS
# ==========================================

def obtenir_types_billets(db: Session):
    return db.query(models.TypeBillet).all()


# ==========================================
# LOGIQUE DE VENTE DE BILLETS (CORRIGÉ)
# ==========================================

def effectuer_vente_billet(db: Session, vente: schemas.VenteBilletSchema, agent_id: int):
    # 1. Vérifier si le type de billet existe et s'il reste des places disponibles
    type_billet = db.query(models.TypeBillet).filter(models.TypeBillet.id == vente.type_billet_id).first()
    if not type_billet:
        raise ValueError("Type de billet introuvable.")
    
    # Compter combien de billets de ce type ont déjà été vendus
    billets_vendus_count = db.query(models.Billet).filter(models.Billet.type_billet_id == type_billet.id).count()
    if billets_vendus_count >= type_billet.quantite_max:
        raise ValueError(f"Désolé, il n'y a plus de places disponibles pour la catégorie {type_billet.nom_type}.")

    # 2. Enregistrer ou mettre à jour le client avec le champ 'items'
    db_client = db.query(models.Client).filter(models.Client.telephone == vente.telephone_client).first()
    
    if not db_client:
        # Nouveau client : on l'enregistre avec son nom, prénom, téléphone ET ses items
        db_client = models.Client(
            nom=vente.nom_client,
            prenom=vente.prenom_client,
            telephone=vente.telephone_client,
            items=vente.items # <-- AJOUT : Enregistrement de l'item pour le nouveau client
        )
        db.add(db_client)
    else:
        # Le client existe déjà : on met à jour son champ 'items' avec la valeur actuelle de la vente
        db_client.items = vente.items
        db_client.nom = vente.nom_client # Optionnel: met à jour le nom si changé
        if vente.prenom_client:
            db_client.prenom = vente.prenom_client

    db.commit()
    db.refresh(db_client)

    # 3. Générer un code unique robuste pour le QR Code (UUID v4)
    code_unique_qr = f"TICKET-{uuid.uuid4().hex[:12].upper()}"

    # 4. Créer le billet (On force datetime.now() pour la date locale de la machine)
    # 4. Créer le billet avec l'heure locale exacte forcée
    db_billet = models.Billet(
        code_unique=code_unique_qr,
        statut_scan="disponible",
        client_id=db_client.id,
        type_billet_id=type_billet.id,
        agent_id=agent_id,
        # datetime.now(tz_local) récupère l'heure exacte de Lubumbashi/Kolwezi
        date_achat=datetime.now(tz_local) 
    )
    db.add(db_billet)
    db.commit()
    db.refresh(db_billet)

    # Récupération de l'événement associé via la relation
    evenement = type_billet.evenement

    # Enregistrement dans l'historique
    ajouter_tracking(db, schemas.TicketTrackingCreate(
        billet_id=db_billet.id,
        action="VENTE",
        description=f"Billet vendu au client {db_client.nom} par l'agent ID {agent_id}",
        cree_par=agent_id
    ))

    # 5. Retourner les informations structurées pour la réponse API
    return schemas.BilletAchatResponse(
        ticket_id=db_billet.id,
        code_unique=db_billet.code_unique,
        statut_scan=db_billet.statut_scan,
        type_billet=type_billet.nom_type,
        prix=type_billet.prix,
        taille_table=type_billet.taille_table,
        nom_client=f"{db_client.prenom or ''} {db_client.nom}".strip(),
        telephone_client=db_client.telephone,
        evenement_titre=evenement.titre if evenement else "Événement non spécifié",
        evenement_date=evenement.date_evenement if evenement else datetime.now(),
        evenement_lieu=evenement.lieu_nom if evenement else "Lieu non spécifié",
        date_achat=db_billet.date_achat
    )

# ==========================================
# LOGIQUE DU SCANNER (ANTI-FRAUDE ULTRA-SÉCURISÉ)
# ==========================================

def scanner_et_valider_billet(db: Session, code_unique: str):
    # 1. Chercher le billet correspondant au QR Code scanné
    db_billet = db.query(models.Billet).filter(models.Billet.code_unique == code_unique).first()
    
    # Cas A : Le billet n'existe pas du tout en base de données (Faux billet imprimé maison)
    if not db_billet:
        return schemas.ScanResultResponse(
            valide=False,
            message="ALERTE : Ce billet est invalide ou inexistant ! Accès Refusé."
        )

    nom_client = f"{db_billet.client.prenom or ''} {db_billet.client.nom}".strip() if db_billet.client else "Inconnu"
    type_nom = db_billet.type_billet.nom_type if db_billet.type_billet else "Inconnu"
    titre_evenement = db_billet.type_billet.evenement.titre if (db_billet.type_billet and db_billet.type_billet.evenement) else "Inconnu"

    # Cas B : Le billet a déjà été scanné (Tentative de duplication / Photocopies)
    if db_billet.statut_scan == "scanne":
        return schemas.ScanResultResponse(
            valide=False,
            message=f"FRAUDE DETECTÉE : Billet déjà scanné le {db_billet.date_scan.strftime('%d/%m à %H:%M:%S')}.",
            nom_client=nom_client,
            type_billet=type_nom,
            evenement_titre=titre_evenement,
            date_scan=db_billet.date_scan
        )

    # Cas C : Le billet est valide (Premier passage)
    if db_billet.statut_scan == "disponible":
        # Bloquer immédiatement le billet en DB pour empêcher une double entrée
        db_billet.statut_scan = "scanne"
        db_billet.date_scan = datetime.now()
        db.commit()
        db.refresh(db_billet)

        return schemas.ScanResultResponse(
            valide=True,
            message=f"ACCÈS AUTORISÉ ! Bon événement.",
            nom_client=nom_client,
            type_billet=type_nom,
            evenement_titre=titre_evenement,
            date_scan=db_billet.date_scan
        )


def obtenir_billets_par_agent(db: Session, agent_id: int):
    """
    Récupère tous les billets vendus par un agent spécifique, triés du plus récent au plus ancien.
    """
    return db.query(models.Billet)\
             .filter(models.Billet.agent_id == agent_id)\
             .order_by(models.Billet.date_achat.desc())\
             .all()



def ajouter_tracking(db: Session, tracking: schemas.TicketTrackingCreate):
    db_tracking = models.TicketTracking(
        billet_id=tracking.billet_id,
        action=tracking.action,
        description=tracking.description,
        cree_par=tracking.cree_par,
        cree_le=datetime.now(tz_local)
    )
    db.add(db_tracking)
    db.commit()
    db.refresh(db_tracking)
    return db_tracking