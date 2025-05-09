"""Adding state_code information to location

Revision ID: d57a85b76987
Revises: d6e4bc6e1f61
Create Date: 2025-03-27 06:57:18.621312

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd57a85b76987'
down_revision: Union[str, None] = 'd6e4bc6e1f61'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('locations', sa.Column('state_code', sa.String(), nullable=True))
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('locations', 'state_code')
    # ### end Alembic commands ###
