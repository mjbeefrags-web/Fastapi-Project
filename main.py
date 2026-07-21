from fastapi import FastAPI

from .routers import auth, post
from fastapi.middleware.cors import CORSMiddleware
from .routers import user
from .database import engine , sessionLocal,get_db
from . import models
from .routers import vote

models.Base.metadata.create_all(bind=engine)
origins=["*"]
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return{"message":"hello world"}

app.include_router(post.router)
app.include_router(user.router)
app.include_router(auth.router)
app.include_router(vote.router)

