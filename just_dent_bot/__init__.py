# Safe startup probe for the ClinicCards connection.
# It logs only configuration status, counts and field names — never the API key or patient data.
try:
    from .cliniccards import safe_probe_sync

    print("ClinicCards startup probe:", safe_probe_sync(), flush=True)
except Exception as exc:
    print(f"ClinicCards startup probe failed: {type(exc).__name__}: {str(exc)[:200]}", flush=True)
