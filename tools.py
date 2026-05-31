from fastapi import FastAPI , Depends , HTTPException , status , Response , APIRouter
from sqlalchemy.orm import Session
from typing import List , Optional


#main 
from fastapi import FastAPI

from .routers import auth, post, user
from .database import engine , sessionLocal,get_db
from . import models
from .routers import vote

models.Base.metadata.create_all(bind=engine)

app = FastAPI()




#=========================DATABASE=====================================
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

SQLALCHEMY_DATABSE_URL=f'postgresql://{settings.database_username}:{settings.database_password}@{settings.database_hostname}:{settings.database_port}/{settings.database_name}'
engine= create_engine(SQLALCHEMY_DATABSE_URL)

sessionLocal= sessionmaker(autocommit=False ,autoflush=False,bind=engine)

Base = declarative_base()

def get_db():
    db = sessionLocal()
    try:
        yield db
    finally:
        db.close()



#=====================models==================
from .database import Base
from sqlalchemy import Column, Integer,String,Boolean , ForeignKey
from sqlalchemy.orm import relationship

from sqlalchemy.sql.sqltypes import TIMESTAMP
from sqlalchemy.sql.expression import text
