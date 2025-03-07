"""Changing appointment columns

Revision ID: f44fbe38f10e
Revises: edd54ad45525
Create Date: 2025-02-14 18:04:23.523783

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f44fbe38f10e'
down_revision: Union[str, None] = 'edd54ad45525'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('appointments', sa.Column('approved_datetime', sa.DateTime(), nullable=True))
    op.add_column('appointments', sa.Column('approved_by', sa.Integer(), nullable=True))
    op.create_foreign_key(None, 'appointments', 'users', ['approved_by'], ['id'])
    op.drop_column('appointments', 'approved_date')
    op.drop_column('appointments', 'approved_time')
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('appointments', sa.Column('approved_time', sa.VARCHAR(), autoincrement=False, nullable=True))
    op.add_column('appointments', sa.Column('approved_date', sa.DATE(), autoincrement=False, nullable=True))
    op.drop_constraint(None, 'appointments', type_='foreignkey')
    op.drop_column('appointments', 'approved_by')
    op.drop_column('appointments', 'approved_datetime')
    # ### end Alembic commands ###
