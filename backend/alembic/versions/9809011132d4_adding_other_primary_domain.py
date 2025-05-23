"""Adding other primary domain

Revision ID: 9809011132d4
Revises: 593ef80e83e0
Create Date: 2025-03-13 18:39:44.377933

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9809011132d4'
down_revision: Union[str, None] = '593ef80e83e0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('dignitaries', sa.Column('primary_domain_other', sa.String(), nullable=True))
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('dignitaries', 'primary_domain_other')
    # ### end Alembic commands ###
