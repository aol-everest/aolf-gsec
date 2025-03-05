"""empty message

Revision ID: 593ef80e83e0
Revises: add_appointment_dignitary_table, ffab84bd4530
Create Date: 2025-03-04 22:43:45.438808

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '593ef80e83e0'
down_revision: Union[str, None] = ('add_appointment_dignitary_table', 'ffab84bd4530')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
