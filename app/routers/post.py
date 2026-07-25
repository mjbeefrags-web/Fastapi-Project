from fastapi import FastAPI , Depends , HTTPException , status , Response , APIRouter
from sqlalchemy.orm import Session
from typing import List , Optional

from .. import oauth2
from .. import models
from .. import schemas
from ..database import get_db
from sqlalchemy import  func

router=APIRouter(prefix="/posts",tags=["Posts"])

#get all posts
@router.get("/",response_model=List[schemas.PostVote])  
def root(db:Session = Depends(get_db), current_user:int  =  Depends(oauth2.get_current_user), limit: int = 10 , skip: int = 0 , search: Optional[str] = ""):

    # posts=db.query(models.post).filter(models.post.title.contains(search)).limit(limit).offset(skip).all()
    
    posts= db.query(models.post , func.count(models.Vote.post_id).label("votes")).join(models.Vote , models.Vote.post_id == models.post.id , isouter=True).group_by(models.post.id).filter(models.post.title.contains(search)).limit(limit).offset(skip).all()
    
    if not posts:
        raise HTTPException(status_code=404, detail="No Posts Yet")

     
    return posts


#get the current loged in user posts only 
@router.get("/mypost")
def my_posts(db: Session = Depends(get_db),current_user=  Depends(oauth2.get_current_user)):

    posts= db.query(models.post).filter(models.post.owner_id == current_user.id ).all()

    return posts


#Creating a post 
@router.post("/",status_code=status.HTTP_201_CREATED,response_model=schemas.PostOut  )
def createpost(post:schemas.Post, db:Session = Depends(get_db) , current_user  =  Depends(oauth2.get_current_user)):
    add_post= models.post(owner_id = current_user.id ,**post.dict())
    db.add(add_post)
    db.commit()
    db.refresh(add_post)
    return add_post
    

#Update a post 
@router.put("/{post_id}" , response_model=schemas.PostOut)
def update_item(post_id:int,post:schemas.Post,db:Session = Depends(get_db), current_user  =  Depends(oauth2.get_current_user)):
    post_query= db.query(models.post).filter(models.post.id == post_id)
    existing_post=post_query.first()

  
    if not existing_post:
        raise HTTPException(status_code=404, detail="Post not found")
    

    if  existing_post.owner_id != current_user.id:  
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail= "Not Authorized to preform this acction")
    
    post_query.update(**post.dict(exclude_unset=True), synchronize_session=False)
    db.commit()
    db.refresh(existing_post)
    updated=post_query.first()

    return updated
    


#Get a single post via id 
@router.get("/{post_id}" , response_model=schemas.PostVote)
def get_post(post_id: int, db: Session = Depends(get_db), current_user:int  =  Depends(oauth2.get_current_user)):
    post =db.query(models.post , func.count(models.Vote.post_id).label("votes")).join(models.Vote , models.Vote.post_id == models.post.id , isouter=True).group_by(models.post.id).filter(models.post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    return post


#delete a post with id 
@router.delete("/{post_id}")
def delete_post(post_id: int, db: Session = Depends(get_db), current_user=  Depends(oauth2.get_current_user)):

    post_query = db.query(models.post).filter(models.post.id == post_id)
    post = post_query.first()

    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if post.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail= "Not Authorized to preform this acction")

    post_query.delete(synchronize_session=False)
    db.commit()
    return {"message": "Post deleted successfully"}


