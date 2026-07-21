from fastapi.testclient import TestClient
from ..main import app
from ..schemas import UserOut
from ..database import get_db
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from ..config import settings
from ..database import Base


SQLALCHEMY_DATABSE_URL=f'postgresql://{settings.database_username}:{settings.database_password}@{settings.database_hostname}:{settings.database_port}/{settings.database_name}_test'
engine= create_engine(SQLALCHEMY_DATABSE_URL)

TestingsessionLocal= sessionmaker(autocommit=False ,autoflush=False,bind=engine)

Base.metadata.create_all(bind=engine)


def override_get_db():
    db = TestingsessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db  
client = TestClient(app)


def test_root():
    res = client.get("/")
    assert res.status_code == 200
    assert res.json() == {"message":"hello world"}


def test_create_user():
    res = client.post("/users" , json={"email": "tesdfsfgfdgdfting@gmail.com","password": "test123"})
    new_user=UserOut(**res.json())
    assert res.status_code == 201
    assert new_user.email == "tesdfsfgfdgdfting@gmail.com"