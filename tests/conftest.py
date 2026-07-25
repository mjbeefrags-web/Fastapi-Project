from fastapi.testclient import TestClient
from app.main import app
from app.schemas import UserOut
from app.database import get_db
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings
from app.database import Base
import pytest

from app import schemas
import pytest
from app.config import settings
from jose import jwt
from app.oauth2 import create_access_token
from app import models

SQLALCHEMY_DATABSE_URL=f'postgresql://{settings.database_username}:{settings.database_password}@{settings.database_hostname}:{settings.database_port}/{settings.database_name}_test'
engine= create_engine(SQLALCHEMY_DATABSE_URL)

TestingsessionLocal= sessionmaker(autocommit=False ,autoflush=False,bind=engine)




@pytest.fixture()
def session():
    print("my session fixture ran")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingsessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture()
def client(session):
    def override_get_db():

        try:
            yield session
        finally:
            session.close()
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)



@pytest.fixture
def test_user(client):
    user_data= {"email":"dylr540@gmail.com", 
                "password":"mjbee123"}

    res = client.post("/users/" , json=user_data)


    assert res.status_code == 201
    new_user = res.json()
    new_user["password"]=user_data["password"] 
    return new_user

@pytest.fixture
def token(test_user):
    return create_access_token({"user_id":test_user['id']})


@pytest.fixture
def authorized_client(client,token):
    client.headers={
        **client.headers,
        "Authorization":f"Bearer {token}"
    }
    return client

@pytest.fixture
def test_posts(test_user, session):
    post_data=[
        {
            "title":"first post",
            "content":"first content",
            "owner_id":test_user['id']
        },
        {   "title":"secound post ",
            "content":"whatever",
            "owner_id":test_user['id']
            },
        {
             "title":"thirdpost",
            "content":"yeahyeah",
            "owner_id":test_user['id']
        }
    ]

    def create_posts_modle(posts):
        return models.post(**posts)


    post_map = map(create_posts_modle, post_data)
    posts = list(post_map)
    session.add_all(posts)
    session.commit()
    return session.query(models.post).all()

