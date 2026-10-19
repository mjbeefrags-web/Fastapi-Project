#class for Items that takes in the needed data for an item
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from datetime import datetime
from typing import Optional


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Post(ORMModel):
    title:str
    content:str
    published:bool |None=None


class UserOut(ORMModel):
    email:EmailStr
    id:int
    created_at:datetime


class PostOut(Post):
    id:int
    owner_id:int
    created_at:datetime
    owner:UserOut


class PostVote(ORMModel):
    post:PostOut
    votes:int


class UserCreate(BaseModel):
    email:EmailStr
    password:str = Field(max_length=72)

class Login(BaseModel):
    email:EmailStr
    password:str



class Token(BaseModel):
    token:str # access_
    token_type:str



class TokenData(BaseModel):
    id : Optional[int] = None

class Vote(BaseModel):
    post_id:int
    dir:int