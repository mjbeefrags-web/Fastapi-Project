"""adding phone number colom to post table 

Revision ID: 2b2b307dfb67
Revises: 
Create Date: 2026-05-31 17:07:54.109017

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2b2b307dfb67'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('posts',sa.Column('test', sa.String() , nullable=True))
    pass


def downgrade() -> None:
    op.drop_column('posts','test')
    pass
