import psutil
import xml.etree.ElementTree as ET

def get_info():
    procs = psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent', 'io_counters', 'status'])
    
    data = ET.Element('test')
    
    parentRoot = ET.Element('processes')
    for proc in procs:
        childRoot = ET.SubElement(parentRoot, 'PID_' + str(proc.pid))
        
        nameNode = ET.SubElement(childRoot, 'name')
        nameNode.text = (str(proc.name()))
        
        cpuPercentNode = ET.SubElement(childRoot, 'cpu_percent')
        cpuPercentNode.text = (str(proc.cpu_percent()))
        
        memoryPercentNode = ET.SubElement(childRoot, 'memory_percent')
        memoryPercentNode.text = (str(proc.memory_percent()))
        
        ioCountersNode = ET.SubElement(childRoot, 'io_counters')
        ioCountersNode.text = (str(proc.io_counters()))
        
        statusNode = ET.SubElement(childRoot, 'status')
        statusNode.text = (str(proc.status()))
    
    report = ET.tostring(parentRoot)
    open("report.xml", "wb").write(report)



get_info()