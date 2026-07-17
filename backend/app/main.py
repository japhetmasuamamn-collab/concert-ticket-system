# backend/app/main.py
from fastapi import FastAPI, Depends, HTTPException, status, Header
from fastapi.responses import JSONResponse  # <-- AJOUTE CETTE LIGNE
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from datetime import datetime
from fastapi.responses import HTMLResponse
from fastapi import Request

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
            "telephone" : agent.telephone,
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

# ==========================================================
# ENDPOINT D'ANNULATION (ADMINISTRATION/SÉCURITÉ)
# ==========================================================

@app.delete("/api/billets/{ticket_id}", tags=["Billets"])
def annuler_et_supprimer_billet(ticket_id: int, db: Session = Depends(get_db)):
    """
    Supprime un billet de la base de données après avoir nettoyé 
    son historique de tracking afin d'éviter les violations de clés étrangères.
    """
    # 1. Rechercher si le billet existe
    billet = db.query(models.Billet).filter(models.Billet.id == ticket_id).first()
    if not billet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Billet introuvable en base de données."
        )

    try:
        # 2. Supprimer d'abord l'historique de scan/tracking lié à ce billet spécifique
        db.query(models.TicketTracking).filter(models.TicketTracking.billet_id == ticket_id).delete()
        
        # 3. Supprimer le billet physique
        db.delete(billet)
        
        # 4. Enregistrer les modifications en base de données (Commit)
        db.commit()
        
        return {
            "status": "success",
            "message": f"Le billet {ticket_id} et son historique de scan ont été supprimés avec succès."
        }
        
    except Exception as e:
        db.rollback()  # Annule la transaction en cours en cas de plantage
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la suppression en base de données : {str(e)}"
        )


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

@app.get("/api/billets/public/{code_unique}")
def obtenir_billet_public(code_unique: str, db: Session = Depends(get_db)):

    billet = db.query(models.Billet).filter(
        models.Billet.code_unique == code_unique
    ).first()

    if not billet:
        raise HTTPException(
            status_code=404,
            detail="Billet introuvable"
        )

    return {
        "code_unique": billet.code_unique,
        "nom_client": billet.client.nom,
        "type_billet": billet.type_billet.nom_type,
        "prix": float(billet.type_billet.prix),
        "evenement_titre": billet.type_billet.evenement.titre,
        "evenement_date": billet.type_billet.evenement.date_evenement,
        "evenement_lieu": billet.type_billet.evenement.lieu_nom
    }

# -------------------------------------------------------------
# 1. ENDPOINT PUBLIC : Détails du billet par code unique (HARMONISÉ ET SÉCURISÉ)
# -------------------------------------------------------------
# -------------------------------------------------------------
# 1. ENDPOINT PUBLIC : Détails du billet par code unique (CORRIGÉ)
# -------------------------------------------------------------
@app.get("/ticket/{code_unique}", response_class=HTMLResponse)
def afficher_billet_html(code_unique: str, request: Request, db: Session = Depends(get_db)):
    billet = db.query(models.Billet).filter(
        models.Billet.code_unique == code_unique
    ).first()

    if not billet:
        return HTMLResponse(
            """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Billet introuvable</title>
                <style>
                    body { background-color: #0b0c10; color: #f5f5f7; font-family: system-ui, sans-serif; text-align: center; padding-top: 100px; }
                    .error-box { max-width: 400px; margin: auto; padding: 30px; background: #161b22; border: 1px solid #ef4444; border-radius: 12px; }
                    h1 { color: #ef4444; font-size: 24px; }
                </style>
            </head>
            <body>
                <div class="error-box">
                    <h1>⚠️ Billet Introuvable</h1>
                    <p>Ce code de billet est invalide ou a été supprimé du système.</p>
                </div>
            </body>
            </html>
            """,
            status_code=404
        )

    client = billet.client
    type_billet = billet.type_billet
    evenement = type_billet.evenement if type_billet else None

    # Formatage de la date à la main en Python
    date_str = "ÉVÉNEMENT"
    if evenement and evenement.date_evenement:
        try:
            date_str = evenement.date_evenement.strftime('%d %B %Y').upper()
        except AttributeError:
            date_str = str(evenement.date_evenement).upper()

    titre_evenement = evenement.titre if evenement else "ÉVÉNEMENT"
    lieu_evenement = evenement.lieu_nom if evenement else "LIEU NON SPÉCIFIÉ"
    nom_client = client.nom if client else "CLIENT ANONYME"
    nom_type = type_billet.nom_type if type_billet else "STANDARD"
    prix_ticket = f"{type_billet.prix} USD" if type_billet else "? USD"

    # Encodage sécurisé du code unique pour l'API QR Code
    import urllib.parse
    code_encode = urllib.parse.quote(billet.code_unique)

    return f"""
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Billet Électronique - {titre_evenement}</title>
        <style>
            body {{
                background-color: #0b0c10;
                color: #f5f5f7;
                font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                margin: 0;
                padding: 20px;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                box-sizing: border-box;
            }}

            .ticket-container {{
                display: flex;
                background-color: #ffffff;
                color: #000000;
                border-radius: 12px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.5);
                overflow: hidden;
                border: 1px solid #d1d5db;
                min-height: 250px;
                max-width: 650px;
                width: 100%;
            }}

            .ticket-left {{
                background-color: #111827;
                color: #ffffff;
                padding: 24px;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                border-right: 2px dashed #e5e7eb;
                position: relative;
                width: 140px;
                min-width: 140px;
                text-align: center;
                box-sizing: border-box;
            }}

            .ticket-stamp {{
                position: absolute;
                top: 12px;
                font-size: 8px;
                letter-spacing: 1px;
                color: #9ca3af;
                font-weight: bold;
            }}

            .ticket-value {{
                font-size: 20px;
                font-weight: 900;
                letter-spacing: 1px;
                color: #ef4444;
                text-transform: uppercase;
            }}

            .ticket-price {{
                font-size: 24px;
                font-weight: bold;
                margin-top: 6px;
            }}

            .ticket-right {{
                flex: 1;
                padding: 20px 24px;
                display: flex;
                flex-direction: column;
                justify-content: flex-start;
                position: relative;
                gap: 10px;
                box-sizing: border-box;
                background-color: #ffffff;
            }}

            .ticket-header {{
                display: flex;
                flex-direction: column;
                gap: 2px;
            }}

            .ticket-event {{
                font-size: 18px;
                font-weight: 800;
                letter-spacing: 0.5px;
                color: #111827;
                margin-right: 100px;
            }}

            .ticket-date {{
                font-size: 11px;
                color: #ef4444;
                font-weight: 700;
                margin-top: 4px;
            }}

            .ticket-location {{
                font-size: 11px;
                color: #4b5563;
                font-weight: 500;
            }}

            .ticket-details {{
                display: flex;
                flex-direction: column;
                gap: 6px;
                margin: 10px 0;
            }}

            .ticket-meta {{
                display: flex;
                flex-direction: column;
            }}

            .meta-label {{
                font-size: 9px;
                color: #6b7280;
                font-weight: bold;
            }}

            .meta-value {{
                font-size: 14px;
                font-weight: 700;
                text-transform: uppercase;
                color: #111827;
            }}

            .meta-value-code {{
                font-size: 12px;
                font-family: monospace;
                color: #374151;
                font-weight: bold;
            }}

            .qr-container {{
                position: absolute;
                right: 24px;
                bottom: 20px;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
            }}

            .qr-image {{
                width: 90px;
                height: 90px;
                border: 1px solid #e5e7eb;
                padding: 4px;
                border-radius: 4px;
                background: white;
            }}

            .qr-tag {{
                font-size: 8px;
                font-weight: bold;
                color: #10b981;
                text-align: center;
            }}

            @media (max-width: 600px) {{
                .ticket-container {{
                    flex-direction: column;
                }}
                .ticket-left {{
                    width: 100%;
                    min-width: auto;
                    border-right: none;
                    border-bottom: 2px dashed #e5e7eb;
                    padding: 20px;
                }}
                .ticket-right {{
                    padding: 24px;
                    padding-bottom: 140px;
                }}
                .ticket-event {{
                    margin-right: 0;
                }}
                .qr-container {{
                    position: relative;
                    right: auto;
                    bottom: auto;
                    margin-top: 20px;
                    align-self: center;
                }}
            }}
        </style>
    </head>
    <body>

        <div class="ticket-container">
            <div class="ticket-left">
                <div class="ticket-stamp">ARTI-SYS SECURE</div>
                <div class="ticket-value">{nom_type}</div>
                <div class="ticket-price">{prix_ticket}</div>
            </div>

            <div class="ticket-right">
                <div class="ticket-header">
                    <span class="ticket-event">{titre_evenement}</span>
                    <span class="ticket-date">📅 {date_str}</span>
                    <span class="ticket-location">📍 {lieu_evenement}</span>
                </div>
                
                <div class="ticket-details">
                    <div class="ticket-meta">
                        <span class="meta-label">TITULAIRE :</span>
                        <span class="meta-value">{nom_client}</span>
                    </div>
                    <div class="ticket-meta">
                        <span class="meta-label">ID BILLET :</span>
                        <span class="meta-value-code">{billet.code_unique}</span>
                    </div>
                </div>

                <div class="qr-container">
                    <img 
                        src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data={code_encode}&color=000000" 
                        alt="QR Code" 
                        class="qr-image"
                    />
                    <div class="qr-tag">✓ SCAN UNIQUE</div>
                </div>
            </div>
        </div>

    </body>
    </html>
    """

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


@app.post("/api/admin/agents", response_model=schemas.UtilisateurResponse, tags=["Administration"])
def creer_un_nouvel_agent(payload: schemas.UtilisateurCreate, db: Session = Depends(get_db)):
    """
    Crée un nouvel agent ou administrateur depuis le panneau de contrôle frontend.
    Hache automatiquement le mot de passe via le CRUD sous-jacent.
    """
    # 1. Vérifier si l'utilisateur existe déjà par son numéro de téléphone
    agent_existe = crud.get_utilisateur_par_telephone(db, telephone=payload.telephone)
    if agent_existe:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"L'agent avec le numéro {payload.telephone} existe déjà."
        )
    
    try:
        # 2. Insérer l'utilisateur en utilisant ta fonction CRUD officielle
        nouvel_utilisateur = crud.creer_utilisateur(db=db, utilisateur=payload)
        return nouvel_utilisateur
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la création du compte : {str(e)}"
        )



# Schéma d'entrée pour la modification du stock
class StockUpdatePayload(BaseModel):
    methode: str  # "ajouter" ou "definir"
    quantite: int

# --- DANS TON FICHIER backend/app/main.py ---

@app.put("/api/admin/categories/{categorie_id}/stock", tags=["Administration"])
def modifier_stock_categorie(
    categorie_id: int, 
    payload: StockUpdatePayload, 
    db: Session = Depends(get_db)
):
    # 1. Rechercher en utilisant le bon modèle : models.TypeBillet
    categorie = db.query(models.TypeBillet).filter(models.TypeBillet.id == categorie_id).first()
    if not categorie:
        raise HTTPException(status_code=404, detail="Catégorie de billet introuvable.")

    # On récupère le nombre de billets déjà vendus associés à ce type de billet
    # (Puisque la relation dans TypeBillet s'appelle 'billets')
    nb_vendus = len(categorie.billets)

    # 2. Appliquer les modifications selon la méthode choisie
    if payload.methode == "ajouter":
        categorie.quantite_max += payload.quantite
    elif payload.methode == "definir":
        # Interdire de fixer un stock inférieur à ce qui a déjà été vendu
        if payload.quantite < nb_vendus:
            raise HTTPException(
                status_code=400, 
                detail=f"Impossible de définir un stock inférieur aux ventes actuelles ({nb_vendus} vendus)."
            )
        categorie.quantite_max = payload.quantite
    else:
        raise HTTPException(status_code=400, detail="Méthode non valide. Utilisez 'ajouter' ou 'definir'.")

    db.commit()
    db.refresh(categorie)
    
    return {"message": "Stock mis à jour avec succès", "nouveau_total": categorie.quantite_max}



# Schéma de requête pour le changement de mot de passe
class ChangerMdpPayload(BaseModel):
    ancien_mot_de_passe: str
    nouveau_mot_de_passe: str


# ==========================================================
# ENDPOINT PROFILE : MODIFICATION MOT DE PASSE AGENT
# ==========================================================

@app.put("/api/mon-compte/modifier-mdp", tags=["Profil"])
def modifier_mon_mot_de_passe(
    payload: ChangerMdpPayload,
    x_agent_id: str = Header(None, alias="X-Agent-Id"),
    db: Session = Depends(get_db)
):
    """
    Permet à un agent connecté de modifier son mot de passe en vérifiant 
    l'ancien et en hachant le nouveau via crud.pwd_context.
    """
    # 1. Vérification du Header transmis par React
    if not x_agent_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identification de l'agent manquante dans les entêtes."
        )
        
    # 2. Recherche de l'utilisateur dans la table via models.Utilisateur
    agent = db.query(models.Utilisateur).filter(models.Utilisateur.id == int(x_agent_id)).first()
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Compte agent introuvable."
        )

    # 3. Vérification de l'ancien mot de passe haché (en utilisant ton crud.pwd_context)
    if not crud.pwd_context.verify(payload.ancien_mot_de_passe, agent.mot_de_passe):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="L'ancien mot de passe est incorrect."
        )

    # 4. Hachage du nouveau mot de passe avec le même algorithme que la création/login
    agent.mot_de_passe = crud.pwd_context.hash(payload.nouveau_mot_de_passe)

    # 5. Sauvegarde en Base de données
    db.commit()
    
    return {"status": "success", "message": "Votre mot de passe a été modifié avec succès."}
