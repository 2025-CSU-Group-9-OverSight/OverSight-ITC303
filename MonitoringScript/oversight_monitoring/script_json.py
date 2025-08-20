import psutil
import json
import time
import sys
import websockets
import asyncio

procs = None

print(sys.executable)

async def main(uri):
    async with websockets.connect(uri) as websocket:
        
        """Test stuff to try and see if I can get a response"""
        await websocket.send('Hello World!')
        response = await websocket.recv()
        print(response)
        
        await send_report(websocket)
        while True:
            time.sleep(5)
            await send_report(websocket)

    
async def send_report(websocket):
    data = [
        
    ]
    
    procs = psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent', 'io_counters', 'status'])
    
    for proc in procs:
        data.append(
            {'pid': str(proc.pid), 
            'name': str(proc.name()),
            'cpu_percent': str(proc.cpu_percent()),
            'memory_percent': str(proc.memory_percent()),
            'io_counters': str(proc.io_counters()),
            'status': str(proc.status())}
        )
    
    """More test prints"""
    print('Trying send...')
    await websocket.send(json.dumps(data))
    print('Sent!')

if __name__ == "__main__":
    websocket_uri = "ws://localhost:3000/api/ws"
    asyncio.run(main(websocket_uri))