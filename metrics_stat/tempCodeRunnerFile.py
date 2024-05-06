pd.to_datetime(timestamp).min().replace(hour=0, minute=0, second=0, microsecond=0)
    # minutes_since