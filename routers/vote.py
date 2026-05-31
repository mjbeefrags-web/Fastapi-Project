from fastapi import FastAPI , Depends , HTTPException , status , Response , APIRouter

from .. import models, oauth2, schemas 
from .. import database
from sqlalchemy.orm import Session
router = APIRouter( prefix='/vote' , tags=['Vote'])

@router.post("/",status_code=status.HTTP_201_CREATED)
def vote(vote:schemas.Vote , db:Session = Depends(database.get_db) , current_user = Depends(oauth2.get_current_user)):

    post = db.query(models.Vote).filter(models.Vote.post_id == vote.post_id).first()

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