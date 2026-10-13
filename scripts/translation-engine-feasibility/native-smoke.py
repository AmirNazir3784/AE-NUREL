"""Run the repository's UNMODIFIED helper against local files, with networking disabled."""
import ctypes
import hashlib
import importlib.metadata
import importlib.util
import json
from pathlib import Path
import platform
import socket
import time
import traceback

ROOT = Path("artifacts/translation-engine-feasibility").resolve()
BUNDLE = ROOT / "indictrans2"

def forbidden_network(*args, **kwargs):
    raise RuntimeError("Research inference is offline; network connections are forbidden.")

socket.create_connection = forbidden_network
socket.socket.connect = forbidden_network
socket.socket.connect_ex = forbidden_network

def peak_working_set():
    class Counters(ctypes.Structure):
        _fields_ = [("cb", ctypes.c_ulong), ("PageFaultCount", ctypes.c_ulong),
                    ("PeakWorkingSetSize", ctypes.c_size_t), ("WorkingSetSize", ctypes.c_size_t),
                    ("QuotaPeakPagedPoolUsage", ctypes.c_size_t), ("QuotaPagedPoolUsage", ctypes.c_size_t),
                    ("QuotaPeakNonPagedPoolUsage", ctypes.c_size_t), ("QuotaNonPagedPoolUsage", ctypes.c_size_t),
                    ("PagefileUsage", ctypes.c_size_t), ("PeakPagefileUsage", ctypes.c_size_t)]
    counters = Counters()
    counters.cb = ctypes.sizeof(counters)
    kernel = ctypes.WinDLL("kernel32")
    kernel.GetCurrentProcess.restype = ctypes.c_void_p
    psapi = ctypes.WinDLL("psapi")
    psapi.GetProcessMemoryInfo.argtypes = [ctypes.c_void_p, ctypes.POINTER(Counters), ctypes.c_ulong]
    if not psapi.GetProcessMemoryInfo(kernel.GetCurrentProcess(), ctypes.byref(counters), counters.cb):
        return None
    return counters.PeakWorkingSetSize

report = {
    "model": "hari31416/indictrans2-en-indic-dist-200M-ONNX-int8",
    "revision": "1eaa43a3fb76f382f1b22c76e56f6ab4926ad68b",
    "helper_sha256": hashlib.sha256((BUNDLE / "translate.py").read_bytes()).hexdigest(),
    "python": platform.python_version(), "platform": platform.platform(),
    "dependencies": {name: importlib.metadata.version(name) for name in ["onnxruntime", "tokenizers", "numpy"]},
    "provider": "CPUExecutionProvider", "network": "socket connections forbidden",
    "planned_settings": {"src_lang": "eng_Latn", "targets": ["urd_Arab", "hin_Deva"], "max_new_tokens": 128, "decoding": "documented greedy"},
    "outputs": [],
}
start = time.perf_counter()
try:
    spec = importlib.util.spec_from_file_location("indictrans_documented_helper", BUNDLE / "translate.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    model = module.IndicTransONNX(str(BUNDLE), providers=["CPUExecutionProvider"])
    report["status"] = "initialized"
    for target in ["urd_Arab", "hin_Deva"]:
        report["outputs"].append({"target": target, "output": model.translate("We'll see.", "eng_Latn", target)})
except Exception as error:
    report["status"] = "initialization_failed"
    report["error_type"] = type(error).__name__
    report["error"] = str(error)
    report["traceback"] = traceback.format_exc()
finally:
    report["attempt_ms"] = (time.perf_counter() - start) * 1000
    report["process_peak_working_set_bytes"] = peak_working_set()
    (ROOT / "native-smoke.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
