from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.database import supabase
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/auth", tags=["auth"])

class PinVerifyRequest(BaseModel):
    pin_code: str

@router.get("/status")
async def get_lock_status():
    try:
        result = supabase.table("app_settings").select("failed_attempts, lockout_until").eq("id", 1).execute()
        if not result.data:
            return {"locked": False, "lockout_until": None}
            
        row = result.data[0]
        lockout_until = row.get("lockout_until")
        
        if lockout_until:
            now = datetime.now(timezone.utc)
            try:
                lockout_time = datetime.fromisoformat(lockout_until.replace("Z", "+00:00"))
                if lockout_time > now:
                    return {"locked": True, "lockout_until": lockout_time.isoformat()}
                else:
                    # Time expired, clear it
                    supabase.table("app_settings").update({
                        "failed_attempts": 0,
                        "lockout_until": None
                    }).eq("id", 1).execute()
            except Exception:
                pass
                
        return {"locked": False, "lockout_until": None}
    except Exception as e:
        return {"locked": False, "lockout_until": None}


@router.post("/verify-pin")
async def verify_pin(req: PinVerifyRequest):
    try:
        result = supabase.table("app_settings").select("pin_code, failed_attempts, lockout_until").eq("id", 1).execute()
        
        if not result.data:
            return {"valid": req.pin_code == "135790", "locked": False}

        row = result.data[0]
        actual_pin = row["pin_code"]
        failed_attempts = row.get("failed_attempts") or 0
        lockout_until = row.get("lockout_until")
        
        now = datetime.now(timezone.utc)
        
        if lockout_until:
            try:
                lockout_time = datetime.fromisoformat(lockout_until.replace("Z", "+00:00"))
                if lockout_time > now:
                    return {"valid": False, "locked": True, "lockout_until": lockout_time.isoformat()}
            except Exception:
                pass

        if req.pin_code == actual_pin:
            # Successful attempt resets everything
            supabase.table("app_settings").update({
                "failed_attempts": 0,
                "lockout_until": None
            }).eq("id", 1).execute()
            return {"valid": True, "locked": False}
        else:
            # Failed attempt
            new_attempts = failed_attempts + 1
            update_data = {"failed_attempts": new_attempts}
            locked = False
            lockout_iso = None
            
            if new_attempts >= 3:
                lockout_time = now + timedelta(hours=1)
                lockout_iso = lockout_time.isoformat()
                update_data["lockout_until"] = lockout_iso
                locked = True
                
            supabase.table("app_settings").update(update_data).eq("id", 1).execute()
            return {"valid": False, "locked": locked, "lockout_until": lockout_iso}
            
    except Exception as e:
        return {"valid": req.pin_code == "135790"}
