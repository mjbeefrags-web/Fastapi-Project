#class for Items that takes in the needed data for an item
from pydantic import BaseModel,EmailStr,Field  
from datetime import datetime
from typing import Optional


class Post(BaseModel):
    title:str
    content:str
    published:bool |None=None
    
    class from_attributes:
        orm_mode=True

class PostVote(BaseModel):
    post:PostOut
    votes:int

    class from_attributes:
        orm_mode=True


class UserOut(BaseModel):
    email:EmailStr
    id:int
    created_at:datetime
    


    class from_attributes:
        orm_mode=True



class PostOut(Post):
    id:int
    owner_id:int
    owner:UserOut


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