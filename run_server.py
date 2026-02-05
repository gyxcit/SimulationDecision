"""
Server launcher with proper stdout configuration for Windows.
Run this instead of uvicorn directly to see all print statements.
"""
import os
import sys

# Force unbuffered output
os.environ['PYTHONUNBUFFERED'] = '1'
sys.stdout.reconfigure(line_buffering=True)

if __name__ == "__main__":
    import uvicorn
    
    print("=" * 60)
    print("🚀 Starting Industrial AI Server with V7 Pipeline Support")
    print("=" * 60)
    print("📌 Unbuffered output enabled - all logs will show in real-time")
    print("=" * 60)
    sys.stdout.flush()
    
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
