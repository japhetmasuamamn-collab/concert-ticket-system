# backend/creer_agent.py
import sys
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app import models, crud, schemas

# S'assurer que les tables existent
Base.metadata.create_all(bind=engine)

def ajouter_nouvel_agent(nom: str, telephone: str, mot_de_passe_clair: str):
    db: Session = SessionLocal()
    try:
        # Vérifier si l'agent existe déjà
        agent_existe = db.query(models.Utilisateur).filter(models.Utilisateur.telephone == telephone).first()
        if agent_existe:
            print(f"[-] L'agent avec le téléphone {telephone} existe déjà en base de données.")
            return

        # Utilisation du schéma de création officiel (qui passera par le hachage de mot de passe)
        nouvel_agent = schemas.UtilisateurCreate(
            nom=nom,
            telephone=telephone,
            mot_de_passe=mot_de_passe_clair,
            role="admin"
        )
        
        agent_cree = crud.creer_utilisateur(db=db, utilisateur=nouvel_agent)
        print(f"[+] Agent créé avec succès !")
        print(f"    Nom : {agent_cree.nom}")
        print(f"    Tél : {agent_cree.telephone}")
        print(f"    Statut : Actif (Mot de passe sécurisé et haché en DB)")
        
    except Exception as e:
        print(f"[!] Erreur lors de la création de l'agent : {e}")
    finally:
        db.close()

if __name__ == "__main__":
    # Paramètres par défaut modifiables ici
    NOM_AGENT = "Japhet"
    TELEPHONE = "0977655062"
    MOT_DE_PASSE = "123456"
    
    print("--- CREATION COMPTE AGENT CONCERT ---")
    ajouter_nouvel_agent(NOM_AGENT, TELEPHONE, MOT_DE_PASSE)