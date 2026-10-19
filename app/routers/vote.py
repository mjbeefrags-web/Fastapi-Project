from fastapi import FastAPI , Depends , HTTPException , status , Response , APIRouter
from sqlalchemy import func

from app import models 
from app import database
from sqlalchemy.orm import Session, aliased

from .. import oauth2, schemas
router = APIRouter( prefix='/vote' , tags=['Vote'])

@router.get("/liked", response_model=list[schemas.PostVote])
def liked_posts(
    db: Session = Depends(database.get_db),
    current_user=Depends(oauth2.get_current_user),
):
    liked_vote = aliased(models.Vote)
    posts = (
        db.query(models.post, func.count(models.Vote.post_id).label("votes"))
        .join(liked_vote, liked_vote.post_id == models.post.id)
        .outerjoin(models.Vote, models.Vote.post_id == models.post.id)
        .filter(liked_vote.user_id == current_user.id)
        .group_by(models.post.id)
        .order_by(models.post.created_at.desc())
        .all()
    )
    return posts


@router.post("/",status_code=status.HTTP_201_CREATED)
def vote(vote:schemas.Vote , db:Session = Depends(database.get_db) , current_user = Depends(oauth2.get_current_user)):

    post = db.query(models.post).filter(models.post.id == vote.post_id).first()

    if not post:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail = "Post does not exist")
    
    vote_qury=db.query(models.Vote).filter(models.Vote.post_id == vote.post_id , models.Vote.user_id == current_user.id)
    vote_found=vote_qury.first()
    if vote.dir == 1:
        if vote_found:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Post {vote.post_id} already liked")
        new_vote= models.Vote(post_id = vote.post_id , user_id= current_user.id)
        db.add(new_vote)
        db.commit()
        
        return {"message":"votes successfully! "}
    else:
        if not vote_found:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="Vote does not exist")
        
        vote_qury.delete(synchronize_session=False)
        db.commit()
        return "Deleted successfully"