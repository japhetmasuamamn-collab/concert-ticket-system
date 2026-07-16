import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Charger les variables d'environnement du fichier .env
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("La variable d'environnement DATABASE_URL n'est pas configurée dans le fichier .env")

# Créer le moteur de connexion PostgreSQL
engine = create_engine(DATABASE_URL)

# Créer une usine de sessions pour interagir avec la DB
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Classe de base pour nos futurs modèles
Base = declarative_base()

# Fonction d'aide pour obtenir une connexion à la DB (Dependency Injection dans FastAPI)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()