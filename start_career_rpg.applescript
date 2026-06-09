try
	-- 1. 關閉殘留的舊 Node 控制伺服器進程，以及舊的 python 控制台
	do shell script "pkill -f start_panel.py || true"
	do shell script "pkill -f control_server.js || true"
	
	-- 2. 啟動最新的 Node 控制伺服器
	do shell script "export PATH='/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin'; node '/Users/hongpeiyuan/Desktop/Brian/Programming Stuff/antiproject/CareerMatch/control_server.js' > /dev/null 2>&1 &"
	
	-- 3. 自動在瀏覽器開啟控制面板網頁
	delay 1.5
	do shell script "open http://localhost:9000"
on error errMsg
	display dialog "啟動控制台失敗: " & errMsg buttons {"確定"} default button "確定" with icon caution
end try
