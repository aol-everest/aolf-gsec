
def str_to_bool(value: str) -> bool:
    """Convert a string to a boolean."""
    return value.lower() in ('true', '1', 't', 'y', 'yes')

