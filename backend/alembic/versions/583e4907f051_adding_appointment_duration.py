"""Adding appointment duration

Revision ID: 583e4907f051
Revises: 801d09330ada
Create Date: 2025-04-14 19:37:51.377532

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '583e4907f051'
down_revision: Union[str, None] = '801d09330ada'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.alter_column('appointment_dignitaries', 'created_by',
               existing_type=sa.INTEGER(),
               nullable=True)
    op.alter_column('appointment_dignitaries', 'updated_by',
               existing_type=sa.INTEGER(),
               nullable=True)
    op.add_column('appointments', sa.Column('duration', sa.Integer(), nullable=True))
    op.execute('UPDATE appointments SET duration = 15 WHERE duration IS NULL')
    op.alter_column('appointments', 'duration',
               existing_type=sa.INTEGER(),
               nullable=False)
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('appointments', 'duration')
    op.alter_column('appointment_dignitaries', 'updated_by',
               existing_type=sa.INTEGER(),
               nullable=False)
    op.alter_column('appointment_dignitaries', 'created_by',
               existing_type=sa.INTEGER(),
               nullable=False)
    # ### end Alembic commands ###
