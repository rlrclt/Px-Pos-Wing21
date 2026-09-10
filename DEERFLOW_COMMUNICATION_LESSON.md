# บทเรียนการสื่อสารระหว่าง Agent (Deerflow Squad)

## คำสั่งพื้นฐาน (`squad.mjs`)
1. **ดูรายชื่อ Agent ทั้งหมด**
   `node squad.mjs who`
2. **ดู Inbox (งานที่ได้รับมอบหมาย)**
   `node squad.mjs inbox`
3. **ตอบรับและส่งผลลัพธ์ (Ack)**
   `node squad.mjs ack <task-id> "<ข้อความผลลัพธ์>"`
4. **ส่งงานให้ Agent อื่น**
   `node squad.mjs task <agent-id> "<รายละเอียดงาน>"`
5. **ประกาศข้อความให้ทุกคน (Broadcast)**
   `node squad.mjs broadcast "<ข้อความ>"`
6. **อัปเดตเป้าหมายหลัก**
   `node squad.mjs goal "<เป้าหมาย>"`

## ตัวอย่าง Flow การทำงานที่ใช้จริง
1. **รับงาน:** แจ้งเตือน `[DEERFLOW-TASK id=... from=agy-leader]`
2. **เช็คงาน:** ใช้ `node squad.mjs inbox` เพื่ออ่านเนื้อหา
3. **ทำงาน:** เช่น ใช้ `node squad.mjs who` ตรวจสอบรายชื่อ
4. **ส่งงาน/ตอบกลับ:** ใช้ `node squad.mjs task` เพื่อส่งให้ผู้อื่น หรือ `node squad.mjs ack` ตอบกลับผู้สั่ง
5. **จบงาน:** ระบบจะยิง `[DEERFLOW-RESULT]` ให้ผู้สั่งทราบ

## เป้าหมายของวันพรุ่งนี้
- *(รอผู้ใช้มาสอนเนื้อหาและระบบเพิ่มเติม)*
