# backend/app/main.py
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.responses import JSONResponse  # <-- AJOUTE CETTE LIGNE
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from datetime import datetime

from .database import engine, Base, get_db
from . import models, schemas, crud

# Création automatique des tables si elles n'existent pas
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Concert Ticket System API",
    description="API sécurisée pour la vente et le scan de billets - Multi-Événements",
    version="1.0.0"
)

# Configuration CORS pour autoriser ton frontend React
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        
        "https://concert-ticket-system-2.onrender.com"  # Ton frontend de production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Schéma de requête strict pour le Login
class LoginRequest(BaseModel):
    telephone: str
    mot_de_passe: str

@app.get("/")
def read_root():
    return {"status": "En ligne", "message": "API de gestion des billets opérationnelle !"}


# ==========================================================
# ENDPOINT D'AUTHENTIFICATION (100% Dynamique & Sécurisé)
# ==========================================================
# ==========================================================
# ENDPOINT D'AUTHENTIFICATION (CORRIGÉ & SÉCURISÉ)
# ==========================================================
@app.post("/api/auth/login", tags=["Authentification"])
def login_agent(payload: LoginRequest, db: Session = Depends(get_db)):
    """
    Connecte un agent, vérifie son mot de passe haché en base de données PostgreSQL
    """
    agent = crud.get_utilisateur_par_telephone(db, telephone=payload.telephone)
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Numéro de téléphone ou mot de passe incorrect."
        )
    
    if not crud.pwd_context.verify(payload.mot_de_passe, agent.mot_de_passe):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Numéro de téléphone ou mot de passe incorrect."
        )
    
    if not agent.actif:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ce compte agent a été désactivé."
        )

    # CORRECTION CRITIQUE : On force l'encapsulation de la réponse et le typage strict
    # pour garantir que les en-têtes CORS soient injectés sans interférence de SQLAlchemy.
    return JSONResponse(
        status_code=200,
        content={
            "status": "success",
            "id": int(agent.id),
            "nom": str(agent.nom),
            "role": str(agent.role)
        }
    )


# ==========================================================
# ENDPOINTS DE VENTE & SCAN DE BILLETS
# ==========================================================

@app.get("/api/billets/types", response_model=list[schemas.TypeBilletResponse], tags=["Billets"])
def lister_types_billets(db: Session = Depends(get_db)):
    """Retourne la liste des types de billets disponibles directement depuis la DB"""
    return crud.obtenir_types_billets(db)


@app.post("/api/billets/vendre", response_model=schemas.BilletAchatResponse, tags=["Billets"])
def vendre_un_billet(vente: schemas.VenteBilletSchema, agent_id: int, db: Session = Depends(get_db)):
    """
    Enregistre un client, génère son billet (QR Code unique) et l'associe à l'agent connecté en DB.
    """
    try:
        nouveau_billet = crud.effectuer_vente_billet(db, vente=vente, agent_id=agent_id)
        return nouveau_billet
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@app.post("/api/billets/scan", response_model=schemas.ScanResultResponse, tags=["Scanner"])
def scanner_billet(payload: schemas.ScanBilletSchema, db: Session = Depends(get_db)):
    """
    Interroge la DB lors du scan à la porte. Valide ou bloque la duplication immédiatement.
    """
    resultat = crud.scanner_et_valider_billet(db, code_unique=payload.code_unique)
    return resultat


@app.get("/api/billets/agent/{agent_id}", response_model=list[schemas.BilletAchatResponse], tags=["Billets"])
def lister_billets_par_agent(agent_id: int, db: Session = Depends(get_db)):
    """
    Retourne la liste de tous les billets vendus par un agent spécifique,
    en extrayant proprement les détails du client et de l'événement lié.
    """
    billets_db = crud.obtenir_billets_par_agent(db, agent_id=agent_id)
    
    reponse = []
    for billet in billets_db:
        nom = billet.client.nom if billet.client else "Client Anonyme"
        telephone = billet.client.telephone if billet.client else ""
        
        # Extraction de l'événement lié de manière sécurisée
        type_billet = billet.type_billet
        evenement = type_billet.evenement if type_billet else None

        reponse.append(
            schemas.BilletAchatResponse(
                ticket_id=billet.id,
                code_unique=billet.code_unique,
                statut_scan=billet.statut_scan,
                type_billet=type_billet.nom_type if type_billet else "Inconnu",
                prix=type_billet.prix if type_billet else 0.0,
                taille_table=type_billet.taille_table if type_billet else 1,
                nom_client=nom,
                telephone_client=telephone,
                evenement_titre=evenement.titre if evenement else "Événement non spécifié",
                evenement_date=evenement.date_evenement if evenement else datetime.now(),
                evenement_lieu=evenement.lieu_nom if evenement else "Lieu non spécifié",
                date_achat=billet.date_achat
            )
        )
    return reponse


# ==========================================================
# NOUVEAUX ENDPOINTS : ADMINISTRATION
# ==========================================================

@app.get("/api/admin/stats", tags=["Administration"])
def obtenir_stats_globales(db: Session = Depends(get_db)):
    """
    Calcule dynamiquement les recettes totales, le nombre de billets vendus et les stocks restants.
    """
    total_vendus = db.query(models.Billet).count()

    total_recettes = db.query(func.sum(models.TypeBillet.prix))\
        .join(models.Billet, models.Billet.type_billet_id == models.TypeBillet.id)\
        .scalar() or 0.0

    types_billets = db.query(models.TypeBillet).all()
    total_stock_restant = 0
    for t in types_billets:
        vendus_pour_ce_type = db.query(models.Billet).filter(models.Billet.type_billet_id == t.id).count()
        restant = max(0, t.quantite_max - vendus_pour_ce_type)
        total_stock_restant += restant

    return {
        "total_recettes": float(total_recettes),
        "total_vendus": total_vendus,
        "total_stock": total_stock_restant
    }


@app.get("/api/admin/categories", tags=["Administration"])
def lister_categories_avec_stocks(db: Session = Depends(get_db)):
    """
    Récupère chaque catégorie de billet avec son prix, son quota global et son état de ventes en temps réel.
    """
    types_billets = db.query(models.TypeBillet).all()
    resultat = []

    for t in types_billets:
        vendus = db.query(models.Billet).filter(models.Billet.type_billet_id == t.id).count()
        resultat.append({
            "id": t.id,
            "nom_type": t.nom_type,
            "prix": float(t.prix),
            "vendus": vendus,
            "quantite_max": t.quantite_max
        })
    
    return resultat


@app.get("/api/admin/agents", tags=["Administration"])
def performance_des_agents(db: Session = Depends(get_db)):
    """
    Récupère la liste des agents (vendeurs) avec leur volume de billets émis et la caisse attendue.
    """
    agents = db.query(models.Utilisateur).filter(models.Utilisateur.role == "agent").all()
    resultat = []

    for agent in agents:
        billets_agent = db.query(models.Billet).filter(models.Billet.agent_id == agent.id).all()
        total_encaisse = sum(b.type_billet.prix for b in billets_agent if b.type_billet)

        resultat.append({
            "id": agent.id,
            "nom": agent.nom,
            "billets_vendus": len(billets_agent),
            "total_encaisse": float(total_encaisse)
        })

    return resultat



# ==========================================================
# NOUVEL ENDPOINT : LISTE DES CLIENTS AYANT PAYÉ
# ==========================================================

@app.get("/api/admin/clients-payes", tags=["Administration"])
def lister_clients_ayant_paye(db: Session = Depends(get_db)):
    """
    Récupère la liste complète des clients ayant acheté un billet
    avec les détails de leur achat pour le panneau d'administration.
    """
    # On récupère tous les billets en pré-chargeant les relations pour éviter le problème de N+1 requêtes
    billets = db.query(models.Billet).order_by(models.Billet.date_achat.desc()).all()
    
    clients_liste = []
    for b in billets:
        # Récupération sécurisée des données liées
        nom_client = b.client.nom if b.client else "Client Anonyme"
        telephone_client = b.client.telephone if b.client else "N/A"
        nom_vendeur = b.agent.nom if b.agent else "Système/Inconnu"
        nom_ticket = b.type_billet.nom_type if b.type_billet else "Inconnu"
        prix_ticket = b.type_billet.prix if b.type_billet else 0.0
        
        clients_liste.append({
            "billet_id": b.id,
            "code_unique": b.code_unique,
            "nom_client": nom_client,
            "telephone_client": telephone_client,
            "categorie_billet": nom_ticket,
            "prix_paye": float(prix_ticket),
            "vendu_par": nom_vendeur,
            "date_achat": b.date_achat,
            "statut_scan": b.statut_scan
        })
        
    return clients_liste


@app.get("/api/admin/tracking", response_model=list[schemas.TicketTrackingResponse], tags=["Administration"])
def obtenir_historique_actions(limit: int = 100, db: Session = Depends(get_db)):
    """
    Récupère les 100 dernières actions effectuées sur le système (ventes, scans, fraudes).
    """
    return db.query(models.TicketTracking)\
             .order_by(models.TicketTracking.cree_le.desc())\
             .limit(limit)\
             .all()


# Dans votre main.py (ou l'endroit où vous définissez vos routes @app.get / @app.post)

# -------------------------------------------------------------
# 1. ENDPOINT PUBLIC : Détails du billet par code unique (CORRIGÉ)
# -------------------------------------------------------------
@app.get("/api/billets/public/{code_unique}")
def obtenir_billet_public(code_unique: str, db: Session = Depends(get_db)):
    # On cherche le billet dans la table de données par son code unique
    billet = db.query(models.Billet).filter(models.Billet.code_unique == code_unique).first()
    
    if not billet:
        raise HTTPException(status_code=404, detail="Billet introuvable")
    
    # On vérifie si un client est rattaché au billet pour éviter un bug si billet.client est None
    nom_du_client = billet.client.nom if billet.client else "Client Inconnu"
    
    # On retourne les détails en utilisant la structure exacte de vos modèles
    return {
        "id": billet.id,
        "code_unique": billet.code_unique,
        "nom_client": nom_du_client,  # CORRIGÉ : On passe par la relation client
        "type_billet": billet.type_billet.nom_type if billet.type_billet else "N/A",
        "prix": billet.type_billet.prix if billet.type_billet else 0.0,
        # CORRIGÉ : On cible les bons attributs de la table Evenement (titre, date_evenement, lieu_nom)
        "evenement_titre": billet.type_billet.evenement.titre if (billet.type_billet and billet.type_billet.evenement) else "Événement sans titre",
        "evenement_date": billet.type_billet.evenement.date_evenement if (billet.type_billet and billet.type_billet.evenement) else None,
        "evenement_lieu": billet.type_billet.evenement.lieu_nom if (billet.type_billet and billet.type_billet.evenement) else "Lieu non défini"
    }

# -------------------------------------------------------------
# 2. ENDPOINT PUBLIC : Historique des scans / tracking du billet
# -------------------------------------------------------------
@app.get("/api/billets/tracking/{billet_id}")
def obtenir_tracking_billet(billet_id: int, db: Session = Depends(get_db)):
    # On récupère toutes les lignes de tracking (étapes d'accès) triées de la plus récente à la plus ancienne
    tracking = db.query(models.TicketTracking)\
                 .filter(models.TicketTracking.billet_id == billet_id)\
                 .order_by(models.TicketTracking.cree_le.desc())\
                 .all()
                 
    return tracking
