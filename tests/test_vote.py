from app import models


def test_vote_on_post(authorized_client,test_posts):
    res = authorized_client.post("/vote/" ,json={"post_id":test_posts[0].id , "dir":1})

    assert res.status_code == 201


def test_get_liked_posts(authorized_client, test_posts, test_user2, session):
    liked_ids = [test_posts[0].id, test_posts[2].id]
    for post_id in liked_ids:
        response = authorized_client.post("/vote/", json={"post_id": post_id, "dir": 1})
        assert response.status_code == 201

    session.add(models.Vote(user_id=test_user2["id"], post_id=liked_ids[0]))
    session.commit()

    response = authorized_client.get("/vote/liked")

    assert response.status_code == 200
    posts_by_id = {item["post"]["id"]: item for item in response.json()}
    assert set(posts_by_id) == set(liked_ids)
    assert posts_by_id[liked_ids[0]]["votes"] == 2
    assert posts_by_id[liked_ids[1]]["votes"] == 1


def test_get_liked_posts_when_none(authorized_client, test_posts):
    response = authorized_client.get("/vote/liked")

    assert response.status_code == 200
    assert response.json() == []


def test_get_liked_posts_unauthorized(client):
    response = client.get("/vote/liked")

    assert response.status_code == 401