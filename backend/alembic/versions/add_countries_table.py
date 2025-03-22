"""add_countries_table

Revision ID: add_countries_table
Revises: a2714f03ae7e
Create Date: 2025-03-22 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


# revision identifiers, used by Alembic.
revision: str = 'add_countries_table'
down_revision: Union[str, None] = 'a2714f03ae7e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create countries table
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    tables = inspector.get_table_names()
    if 'countries' not in tables:
        op.create_table_if_not_exists('countries',
            sa.Column('iso2_code', sa.String(), nullable=False),
            sa.Column('name', sa.String(), nullable=False),
            sa.Column('iso3_code', sa.String(), nullable=False),
            sa.Column('region', sa.String(), nullable=True),
            sa.Column('sub_region', sa.String(), nullable=True),
            sa.Column('intermediate_region', sa.String(), nullable=True),
            sa.Column('country_groups', sa.ARRAY(sa.String()), nullable=True),
            sa.Column('alt_names', sa.ARRAY(sa.String()), nullable=True),
            sa.Column('is_enabled', sa.Boolean(), nullable=False, server_default='true'),
            sa.PrimaryKeyConstraint('iso2_code')
        )
        op.create_index(op.f('ix_countries_iso2_code'), 'countries', ['iso2_code'], unique=False)
        op.create_index(op.f('ix_countries_iso3_code'), 'countries', ['iso3_code'], unique=False)
        op.create_index(op.f('ix_countries_name'), 'countries', ['name'], unique=False)


def downgrade() -> None:
    # Drop countries table
    op.drop_index(op.f('ix_countries_name'), table_name='countries')
    op.drop_index(op.f('ix_countries_iso3_code'), table_name='countries')
    op.drop_index(op.f('ix_countries_iso2_code'), table_name='countries')
    op.drop_table('countries') 