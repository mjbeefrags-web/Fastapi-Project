from app import schemas
import pytest
from app.config import settings
from jose import jwt
from app.oauth2 import create_access_token
from app import models
import pytest

def test_get_all_posts(authorized_client, test_posts):
    res = authorized_client.get("/posts/")

    def valdation(posts):
        return schemas.Post
    post_map = map(valdation , res.json())
    post_list=list(post_map)
    assert len(res.json()) == len(test_posts)
    assert res.status_code == 200

def test_unauthorized_user_get_all_posts(client, test_posts):
    res = client.get("/posts/")

    assert res.status_code == 401 

def test_unauthorized_user_get_one_post(client, test_posts):
    res = client.get(f"/posts/{test_posts[0].id}")

    assert res.status_code == 401 


def test_get_one_nonexisted_post(authorized_client, test_posts):
    res = authorized_client.get(f"/posts/8000")

    assert res.status_code == 404 

def test_get_one_post(authorized_client, test_posts):
    res = authorized_client.get(f"/posts/{test_posts[0].id}")
    post=schemas.PostVote(**res.json())
    assert post.post.id == test_posts[0].id
    assert post.post.content == test_posts[0].content

@pytest.mark.parametrize("title , content , pubished" ,[
    ("new title","new content",True),
    ("awsome title","awsome content",False),
    ("a title ","with some content",True)
])
def test_create_post(authorized_client , test_user , test_posts, title , content , pubished):
    res = authorized_client.post("/posts",json={"title": title , "content":content,"published":pubished})
    created_post=schemas.PostOut(**res.json())
    assert res.status_code == 201
    assert created_post.title == title
    assert created_post.content==content
    assert created_post.published == pubished
    assert created_post.owner_id == test_user['id']

def test_unauthorized_user_create_post(client,test_user,test_posts):
    res = client.post("/posts/", json={"title":"test title","content":"test content","published":True})

    assert res.status_code == 401



def test_unauthorized_user_delete_Post(client, test_user, test_posts):
    res = client.delete(
        f"/posts/{test_posts[0].id}")
    assert res.status_code == 401


def test_delete_post_success(authorized_client,test_posts,test_user):
    res = authorized_client.delete(
            f"/posts/{test_posts[0].id}")
    assert res.status_code == 204


def test_delete_post_non_exist(authorized_client, test_user, test_posts):
    res = authorized_client.delete(
        f"/posts/8000000")

    assert res.status_code == 404

def test_delete_other_user_post(authorized_client, test_user, test_posts):
    res = authorized_client.delete(
                f"/posts/{test_posts[3].id}")
    assert res.status_code == 403


#updtae posts

def test_update_post(authorized_client,test_posts,test_user):
    data = {
        "title": "updated title",
        "content": "updated content",
        "published": True
    }
    res = authorized_client.put(f"/posts/{test_posts[0].id}", json=data)
    print(res.json())
    #updated_post = schemas.PostOut(**res.json())
    assert res.status_code == 200
    #assert updated_post.title == data['title']




def test_unauthorized_user_update_post(client, test_user, test_posts):
    res = client.put(
        f"/posts/{test_posts[0].id}")
    assert res.status_code == 401
