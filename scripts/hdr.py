import win32api
import win32con

def is_hdr_enabled():
    # 获取当前显示设置
    display_info = win32api.GetMonitorInfo(win32api.MonitorFromPoint((0, 0)))
    # 检查HDR功能是否开启
    return display_info['wmiFlags'] & win32con.WMI_HDR == win32con.WMI_HDR

print("HDR 功能是否开启:", is_hdr_enabled())
