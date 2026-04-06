from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.database import supabase

router = APIRouter(prefix="/auth", tags=["auth"])

class PinVerifyRequest(BaseModel):
    pin_code: str

@router.post("/verify-pin")
async def verify_pin(req: PinVerifyRequest):
    try:
        # Fetch the PIN from settings table
        result = supabase.table("app_settings").select("pin_code").eq("id", 1).execute()
        
        if not result.data:
            # Fallback if table doesn't exist or isn't seeded correctly, for safety.
            # But normally we require it to match.
            return {"valid": req.pin_code == "135790"}

        actual_pin = result.data[0]["pin_code"]
        return {"valid": req.pin_code == actual_pin}
    except Exception as e:
        # If the table isn't created yet, we can fallback to the requested pin so the user isn't locked out completely
        return {"valid": req.pin_code == "135790"}
