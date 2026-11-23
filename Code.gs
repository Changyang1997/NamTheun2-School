/**
 * ====================================================================
 * Google Apps Script for Nam Theun 2 School Management System
 * Spreadsheet ID: 1ol57RaMofcBIAbWZ0ip3PP2B4FbhoZYXOkvxa6Ju3nc
 * 
 * ວິທີນຳໃຊ້:
 * 1. ເປີດ Google Sheet: 1ol57RaMofcBIAbWZ0ip3PP2B4FbhoZYXOkvxa6Ju3nc
 * 2. ໄປທີ່ເມນູ: Extensions (ສ່ວນຂະຫຍາຍ) -> Apps Script
 * 3. ກັອບປີ້ Code ທັງໝົດນີ້ໄປວາງໃສ່ Code.gs
 * 4. ກົດ Save (ບັນທຶກ)
 * 5. ກົດ Deploy -> Manage deployments -> Edit (ໄອຄອນດິນສໍ) -> New version -> Deploy
 * ====================================================================
 */

const SPREADSHEET_ID = "1ol57RaMofcBIAbWZ0ip3PP2B4FbhoZYXOkvxa6Ju3nc";

/**
 * ວິເຄາະຕາຕະລາງຮຽນ/ສອນ ຈາກ 6 ຄໍລຳ (col1 = ປ້າຍແຖວ, col2..col6 = ຄ່າ).
 * ຮອງຮັບ 2 ຮູບແບບ:
 *   A) "block"  — ແຖວ = ວັນ (ຈັນ..ສຸກ), ຄໍລຳ = ຄາບເວລາ; ແຍກເປັນ block ຕໍ່ຫ້ອງ/ຄູ
 *   B) "time"   — ແຖວ = ຄາບເວລາ, ຄໍລຳ = ວັນ (ຮູບແບບເກົ່າ)
 */
function parseScheduleGrid_(values) {
  var DAYS = ["ຈັນ", "ອັງຄານ", "ພຸດ", "ພະຫັດ", "ສຸກ", "ເສາ", "ອາທິດ",
              "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  function isDay(s) {
    var t = String(s || "").trim().toLowerCase();
    if (!t) return false;
    for (var i = 0; i < DAYS.length; i++) {
      if (t.indexOf(DAYS[i].toLowerCase()) === 0) return true;
    }
    return false;
  }
  function cell(v) { return (v === null || v === undefined) ? "" : String(v).trim(); }
  function allEmpty(cells) {
    for (var i = 0; i < cells.length; i++) { if (cells[i] !== "") return false; }
    return true;
  }

  var rows = [];
  (values || []).forEach(function (r) {
    rows.push([cell(r[0]), cell(r[1]), cell(r[2]), cell(r[3]), cell(r[4]), cell(r[5])]);
  });

  var dayRowCount = 0;
  rows.forEach(function (r) {
    if (!allEmpty(r.slice(1)) && isDay(r[0])) dayRowCount++;
  });

  // ---- ຮູບແບບ B: ແຖວ = ຄາບເວລາ, ຄໍລຳ = ວັນ ----
  if (dayRowCount === 0) {
    var flat = [];
    rows.forEach(function (r) {
      if (r[0] === "" && allEmpty(r.slice(1))) return;
      flat.push({
        time: r[0], mon: r[1], tue: r[2], wed: r[3], thu: r[4], fri: r[5],
        isBreak: r[0].indexOf("ພັກ") !== -1 || r[1].indexOf("ພັກ") !== -1
      });
    });
    return { layout: "time", blocks: [], rows: flat };
  }

  // ---- ຮູບແບບ A: ແຖວ = ວັນ, ຈັດກຸ່ມຕໍ່ຫ້ອງ/ຄູ ----
  var blocks = [];
  var cur = null;
  rows.forEach(function (r) {
    var label = r[0];
    var cells = r.slice(1);
    var hasCells = !allEmpty(cells);
    if (label === "" && !hasCells) return;             // ແຖວຫວ່າງ
    if (!hasCells) { cur = { title: label, periods: [], days: [] }; blocks.push(cur); return; } // ຫົວຊື່ block
    if (!cur) { cur = { title: "", periods: [], days: [] }; blocks.push(cur); }
    if (isDay(label)) {
      cur.days.push({ label: label, cells: cells });
    } else if (cur.periods.length === 0) {
      cur.periodLabel = label;                          // ປ້າຍຫົວຄາບເວລາຈາກ Sheet
      cur.periods = cells;                              // ແຖວຫົວຄາບເວລາ
    } else {
      cur.days.push({ label: label, cells: cells });
    }
  });

  blocks = blocks.filter(function (b) { return b.days.length > 0; });
  return { layout: "block", blocks: blocks, rows: [] };
}

function emptySchedule_() { return { layout: "block", blocks: [], rows: [] }; }

// ອ່ານຕາຕະລາງດິບໆ 6 ຄໍລຳ ໂດຍເລີ່ມຈາກແຖວ 4 ພ້ອມເກັບຕຳແໜ່ງແທ້ຂອງ Sheet
function scheduleGridValues_(sheet, startCol, maxRows) {
  var values = sheet.getRange(4, startCol, maxRows, 6).getValues();
  return values.map(function(row) {
    return row.map(function(v) {
      return (v === null || v === undefined) ? "" : String(v).trim();
    });
  });
}

function doPost(e) {
  return handleRequest(e);
}

function doGet(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    var ss;
    try {
      ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    } catch(err) {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    }

    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "getSheets";
    var result = {};

    // --------------------------------------------------------
    // ACTION: GET ALL SHEETS & DATA
    // --------------------------------------------------------
    if (action === "getSheets" || action === "sheets") {
      var sheets = ss.getSheets();
      var sheetsData = sheets.map(function(sheet) {
        var name = sheet.getName();
        var logo = "";
        var schoolName = "";
        var subtitle = "";
        var scoreLinks = {
          "ອ1": "", "ອ2": "", "ອ3": "",
          "ປ1": "", "ປ2": "", "ປ3": "", "ປ4": "", "ປ5": "",
          "ມ1": "", "ມ2": "", "ມ3": "", "ມ4": "", "ມ5": "", "ມ6": "", "ມ7": "",
          "rules": "", "other": ""
        };
        var attendanceLinks = {
          "ອ1": "", "ອ2": "", "ອ3": "",
          "ປ1": "", "ປ2": "", "ປ3": "", "ປ4": "", "ປ5": "",
          "ມ1": "", "ມ2": "", "ມ3": "", "ມ4": "", "ມ5": "", "ມ6": "", "ມ7": "",
          "rules": ""
        };
        
        try {
          var range = sheet.getRange("A2:Y3").getValues();
          if (range && range.length > 0) {
            var row2 = range[0];
            logo = row2[0] ? row2[0].toString() : "";       // Col A
            schoolName = row2[1] ? row2[1].toString() : ""; // Col B
            subtitle = row2[2] ? row2[2].toString() : "";   // Col C

            scoreLinks["ອ1"] = row2[4] ? row2[4].toString() : "";  // Col E
            scoreLinks["ອ2"] = row2[5] ? row2[5].toString() : "";  // Col F
            scoreLinks["ອ3"] = row2[6] ? row2[6].toString() : "";  // Col G
            
            scoreLinks["ປ1"] = row2[8] ? row2[8].toString() : "";  // Col I
            scoreLinks["ປ2"] = row2[9] ? row2[9].toString() : "";  // Col J
            scoreLinks["ປ3"] = row2[10] ? row2[10].toString() : "";// Col K
            scoreLinks["ປ4"] = row2[11] ? row2[11].toString() : "";// Col L
            scoreLinks["ປ5"] = row2[12] ? row2[12].toString() : "";// Col M
            
            scoreLinks["ມ1"] = row2[14] ? row2[14].toString() : "";// Col O
            scoreLinks["ມ2"] = row2[15] ? row2[15].toString() : "";// Col P
            scoreLinks["ມ3"] = row2[16] ? row2[16].toString() : "";// Col Q
            scoreLinks["ມ4"] = row2[17] ? row2[17].toString() : "";// Col R
            scoreLinks["ມ5"] = row2[18] ? row2[18].toString() : "";// Col S
            scoreLinks["ມ6"] = row2[19] ? row2[19].toString() : "";// Col T
            scoreLinks["ມ7"] = row2[20] ? row2[20].toString() : "";// Col U
            
            scoreLinks["rules"] = row2[23] ? row2[23].toString() : "";// Col X
            scoreLinks["other"] = row2[24] ? row2[24].toString() : "";// Col Y (ຄະແນນອື່ນໆ)

            // Row 3 = attendance links
            if (range.length > 1) {
              var row3 = range[1];
              attendanceLinks["ອ1"] = row3[4] ? row3[4].toString() : "";  // Col E
              attendanceLinks["ອ2"] = row3[5] ? row3[5].toString() : "";  // Col F
              attendanceLinks["ອ3"] = row3[6] ? row3[6].toString() : "";  // Col G
              
              attendanceLinks["ປ1"] = row3[8] ? row3[8].toString() : "";  // Col I
              attendanceLinks["ປ2"] = row3[9] ? row3[9].toString() : "";  // Col J
              attendanceLinks["ປ3"] = row3[10] ? row3[10].toString() : "";// Col K
              attendanceLinks["ປ4"] = row3[11] ? row3[11].toString() : "";// Col L
              attendanceLinks["ປ5"] = row3[12] ? row3[12].toString() : "";// Col M
              
              attendanceLinks["ມ1"] = row3[14] ? row3[14].toString() : "";// Col O
              attendanceLinks["ມ2"] = row3[15] ? row3[15].toString() : "";// Col P
              attendanceLinks["ມ3"] = row3[16] ? row3[16].toString() : "";// Col Q
              attendanceLinks["ມ4"] = row3[17] ? row3[17].toString() : "";// Col R
              attendanceLinks["ມ5"] = row3[18] ? row3[18].toString() : "";// Col S
              attendanceLinks["ມ6"] = row3[19] ? row3[19].toString() : "";// Col T
              attendanceLinks["ມ7"] = row3[20] ? row3[20].toString() : "";// Col U
              
              attendanceLinks["rules"] = row3[23] ? row3[23].toString() : "";// Col X
            }
          }
        } catch(ex) {}

        // ດຶງຂໍ້ມູນຄູອາຈານເລີ່ມແຕ່ແຖວທີ 6 (B6:G)
        var teachers = [];
        try {
          var lastRowT = sheet.getLastRow();
          if (lastRowT >= 6) {
            var teacherValues = sheet.getRange(6, 2, lastRowT - 5, 6).getValues();
            teachers = teacherValues.map(function(row, idx) {
              return {
                id: idx + 1,
                rowNum: idx + 6,
                photoUrl: row[0] ? row[0].toString().trim() : "", // Col B
                nameLao:  row[1] ? row[1].toString().trim() : "", // Col C
                nameEn:   row[2] ? row[2].toString().trim() : "", // Col D
                position: row[3] ? row[3].toString().trim() : "", // Col E
                subject:  row[4] ? row[4].toString().trim() : "", // Col F
                phone:    row[5] ? row[5].toString().trim() : ""  // Col G
              };
            }).filter(function(t) {
              return t.nameLao || t.nameEn || t.photoUrl || t.position || t.subject;
            });
          }
        } catch(ex) {}

        // ດຶງຂໍ້ມູນນັກຮຽນເລີ່ມແຕ່ແຖວທີ 6 (J6:Q)
        var students = [];
        try {
          var lastRowS = sheet.getLastRow();
          if (lastRowS >= 6) {
            var studentValues = sheet.getRange(6, 10, lastRowS - 5, 8).getValues();
            students = studentValues.map(function(row, idx) {
              var photo = row[0] ? row[0].toString().trim() : "";       // Col J
              var nameLao = row[1] ? row[1].toString().trim() : "";     // Col K
              var nameEn = row[2] ? row[2].toString().trim() : "";      // Col L
              var className = row[3] ? row[3].toString().trim() : "";   // Col M
              var kindergarten = row[5] ? row[5].toString().trim() : "";// Col O
              var primary = row[6] ? row[6].toString().trim() : "";     // Col P
              var secondary = row[7] ? row[7].toString().trim() : "";   // Col Q

              return {
                id: idx + 1,
                rowNum: idx + 6,
                photoUrl: photo,
                nameLao: nameLao,
                nameEn: nameEn,
                className: className || kindergarten || primary || secondary || "—",
                kindergarten: kindergarten,
                primary: primary,
                secondary: secondary
              };
            }).filter(function(s) {
              return s.nameLao || s.nameEn || s.photoUrl || s.className !== "—" || s.kindergarten || s.primary || s.secondary;
            });
          }
        } catch(ex) {}

        // ນັບຈຳນວນຫ້ອງຮຽນຈາກ Range O6:Q19 ເທົ່ານັ້ນ
        var classCount = 0;
        try {
          var classRangeValues = sheet.getRange("O6:Q19").getValues();
          classRangeValues.forEach(function(r) {
            r.forEach(function(cell) {
              var val = cell ? cell.toString().trim() : "";
              if (val && val !== "" && val !== "—") {
                classCount++;
              }
            });
          });
        } catch(ex) {}

        // ດຶງຂໍ້ມູນແຈ້ງການເລີ່ມແຕ່ແຖວທີ 6 (S6:V)
        var announcements = [];
        try {
          var lastRowA = sheet.getLastRow();
          if (lastRowA >= 6) {
            var annValues = sheet.getRange(6, 19, Math.max(lastRowA - 5, 30), 4).getValues();
            annValues.forEach(function(row, idx) {
              var rawDate = row[0];
              var formattedDate = "";
              if (rawDate instanceof Date) {
                formattedDate = Utilities.formatDate(rawDate, Session.getScriptTimeZone(), "yyyy-MM-dd");
              } else if (rawDate) {
                formattedDate = rawDate.toString().trim().split('T')[0];
              }

              var typeRaw = row[1] ? row[1].toString().trim() : "";
              var type = (typeRaw.indexOf('ດ່ວນ') !== -1 || typeRaw.toLowerCase() === 'urgent') ? 'urgent' : 'normal';
              var title = row[2] ? row[2].toString().trim() : "";
              var content = row[3] ? row[3].toString().trim() : "";

              if (title || content || formattedDate) {
                announcements.push({
                  id: idx + 1,
                  rowNum: idx + 6,
                  date: formattedDate,
                  type: type,
                  typeLabel: typeRaw || (type === 'urgent' ? 'ດ່ວນ' : 'ທົ່ວໄປ'),
                  title: title,
                  content: content
                });
              }
            });
          }
        } catch(ex) {}

        // 1. ດຶງຂໍ້ມູນຕາຕະລາງຮຽນນັກຮຽນ (Col X:AC = Col 24..29, Row 4+)
        var studySchedule = emptySchedule_();
        try {
          var maxR1 = Math.max(sheet.getLastRow() - 3, 50);
          var stValues = sheet.getRange(4, 24, maxR1, 6).getValues();
          studySchedule = parseScheduleGrid_(stValues);
        } catch(ex) {}

        // 2. ດຶງຂໍ້ມູນຕາຕະລາງສອນຄູອາຈານ (Col AE:AJ = Col 31..36, Row 4+)
        var teachingSchedule = emptySchedule_();
        try {
          var maxR2 = Math.max(sheet.getLastRow() - 3, 50);
          var tcValues = sheet.getRange(4, 31, maxR2, 6).getValues();
          teachingSchedule = parseScheduleGrid_(tcValues);
        } catch(ex) {}

        return {
          name: name,
          logo: logo,
          schoolName: schoolName,
          subtitle: subtitle,
          scoreLinks: scoreLinks,
          attendanceLinks: attendanceLinks,
          teachers: teachers,
          students: students,
          classCount: classCount,
          announcements: announcements,
          studySchedule: studySchedule,
          teachingSchedule: teachingSchedule
        };
      });

      var simpleNames = sheets.map(function(sheet) { return sheet.getName(); });
      
      result = {
        status: "success",
        spreadsheetId: SPREADSHEET_ID,
        sheets: simpleNames,
        sheetsData: sheetsData
      };
    } 

    // --------------------------------------------------------
    // ACTION: ADD TEACHER
    // --------------------------------------------------------
    else if (action === "addTeacher") {
      var sheetName = e.parameter.sheet;
      var targetSheet = sheetName ? ss.getSheetByName(sheetName) : ss.getSheets()[0];
      if (!targetSheet) {
        result = { status: "error", message: "ບໍ່ພົບ Sheet Tab: " + sheetName };
      } else {
        var photoUrl = e.parameter.photoUrl || "";
        var nameLao  = e.parameter.nameLao  || "";
        var nameEn   = e.parameter.nameEn   || "";
        var position = e.parameter.position || "";
        var subject  = e.parameter.subject  || "";
        var phone    = e.parameter.phone    || "";

        var maxR = Math.max(targetSheet.getLastRow() + 10, 50);
        var teacherRange = targetSheet.getRange(6, 2, maxR, 6).getValues();
        var targetRow = 6 + teacherRange.length;
        for (var i = 0; i < teacherRange.length; i++) {
          var bVal = teacherRange[i][0] ? teacherRange[i][0].toString().trim() : "";
          var cVal = teacherRange[i][1] ? teacherRange[i][1].toString().trim() : "";
          var dVal = teacherRange[i][2] ? teacherRange[i][2].toString().trim() : "";
          if (bVal === "" && cVal === "" && dVal === "") {
            targetRow = i + 6;
            break;
          }
        }

        targetSheet.getRange(targetRow, 2, 1, 6).setValues([[photoUrl, nameLao, nameEn, position, subject, phone]]);
        SpreadsheetApp.flush();
        result = { status: "success", message: "ເພີ່ມຂໍ້ມູນຄູອາຈານສຳເລັດ", row: targetRow };
      }
    }

    // --------------------------------------------------------
    // ACTION: UPDATE / EDIT TEACHER
    // --------------------------------------------------------
    else if (action === "updateTeacher" || action === "editTeacher") {
      var sheetName = e.parameter.sheet;
      var targetSheet = sheetName ? ss.getSheetByName(sheetName) : ss.getSheets()[0];
      if (!targetSheet) {
        result = { status: "error", message: "ບໍ່ພົບ Sheet Tab: " + sheetName };
      } else {
        var rowNum   = parseInt(e.parameter.row) || parseInt(e.parameter.rowNum);
        var photoUrl = e.parameter.photoUrl !== undefined ? e.parameter.photoUrl : "";
        var nameLao  = e.parameter.nameLao  !== undefined ? e.parameter.nameLao  : "";
        var nameEn   = e.parameter.nameEn   !== undefined ? e.parameter.nameEn   : "";
        var position = e.parameter.position !== undefined ? e.parameter.position : "";
        var subject  = e.parameter.subject  !== undefined ? e.parameter.subject  : "";
        var phone    = e.parameter.phone    !== undefined ? e.parameter.phone    : "";

        // If rowNum is not valid, search by name
        if (!rowNum || rowNum < 6) {
          var maxR = Math.max(targetSheet.getLastRow(), 50);
          var searchVals = targetSheet.getRange(6, 3, maxR, 2).getValues();
          for (var i = 0; i < searchVals.length; i++) {
            var nL = searchVals[i][0] ? searchVals[i][0].toString().trim() : "";
            var nE = searchVals[i][1] ? searchVals[i][1].toString().trim() : "";
            if ((nameLao && nL === nameLao.trim()) || (nameEn && nE === nameEn.trim())) {
              rowNum = i + 6;
              break;
            }
          }
        }

        if (rowNum && rowNum >= 6) {
          targetSheet.getRange(rowNum, 2, 1, 6).setValues([[photoUrl, nameLao, nameEn, position, subject, phone]]);
          SpreadsheetApp.flush();
          result = { status: "success", message: "ແກ້ໄຂຂໍ້ມູນຄູອາຈານສຳເລັດ", row: rowNum };
        } else {
          result = { status: "error", message: "ບໍ່ພົບແຖວທີ່ຈະແກ້ໄຂ" };
        }
      }
    }

    // --------------------------------------------------------
    // ACTION: DELETE TEACHER
    // --------------------------------------------------------
    else if (action === "deleteTeacher") {
      var sheetName = e.parameter.sheet;
      var targetSheet = sheetName ? ss.getSheetByName(sheetName) : ss.getSheets()[0];
      if (!targetSheet) {
        result = { status: "error", message: "ບໍ່ພົບ Sheet Tab: " + sheetName };
      } else {
        var rowNum = parseInt(e.parameter.row) || parseInt(e.parameter.rowNum);
        var nameLao = e.parameter.nameLao || "";
        var nameEn  = e.parameter.nameEn || "";

        if (!rowNum || rowNum < 6) {
          var maxR = Math.max(targetSheet.getLastRow(), 50);
          var searchVals = targetSheet.getRange(6, 3, maxR, 2).getValues();
          for (var i = 0; i < searchVals.length; i++) {
            var nL = searchVals[i][0] ? searchVals[i][0].toString().trim() : "";
            var nE = searchVals[i][1] ? searchVals[i][1].toString().trim() : "";
            if ((nameLao && nL === nameLao.trim()) || (nameEn && nE === nameEn.trim())) {
              rowNum = i + 6;
              break;
            }
          }
        }

        if (rowNum && rowNum >= 6) {
          targetSheet.getRange(rowNum, 2, 1, 6).clearContent();
          SpreadsheetApp.flush();
          result = { status: "success", message: "ລຶບຂໍ້ມູນຄູອາຈານສຳເລັດ", row: rowNum };
        } else {
          result = { status: "error", message: "ບໍ່ພົບແຖວທີ່ຈະລຶບ" };
        }
      }
    }

    // --------------------------------------------------------
    // ACTION: ADD STUDENT
    // --------------------------------------------------------
    else if (action === "addStudent") {
      var sheetName = e.parameter.sheet;
      var targetSheet = sheetName ? ss.getSheetByName(sheetName) : ss.getSheets()[0];
      if (!targetSheet) {
        result = { status: "error", message: "ບໍ່ພົບ Sheet Tab: " + sheetName };
      } else {
        var photoUrl  = e.parameter.photoUrl  || "";
        var nameLao   = e.parameter.nameLao   || "";
        var nameEn    = e.parameter.nameEn    || "";
        var className = e.parameter.className || "";

        var maxR = Math.max(targetSheet.getLastRow() + 10, 50);
        var studentRange = targetSheet.getRange(6, 10, maxR, 4).getValues();
        var targetRow = 6 + studentRange.length;
        for (var i = 0; i < studentRange.length; i++) {
          var jVal = studentRange[i][0] ? studentRange[i][0].toString().trim() : "";
          var kVal = studentRange[i][1] ? studentRange[i][1].toString().trim() : "";
          var lVal = studentRange[i][2] ? studentRange[i][2].toString().trim() : "";
          if (jVal === "" && kVal === "" && lVal === "") {
            targetRow = i + 6;
            break;
          }
        }

        targetSheet.getRange(targetRow, 10, 1, 4).setValues([[photoUrl, nameLao, nameEn, className]]);
        SpreadsheetApp.flush();
        result = { status: "success", message: "ເພີ່ມຂໍ້ມູນນັກຮຽນສຳເລັດ", row: targetRow };
      }
    }

    // --------------------------------------------------------
    // ACTION: UPDATE / EDIT STUDENT
    // --------------------------------------------------------
    else if (action === "updateStudent" || action === "editStudent") {
      var sheetName = e.parameter.sheet;
      var targetSheet = sheetName ? ss.getSheetByName(sheetName) : ss.getSheets()[0];
      if (!targetSheet) {
        result = { status: "error", message: "ບໍ່ພົບ Sheet Tab: " + sheetName };
      } else {
        var rowNum    = parseInt(e.parameter.row) || parseInt(e.parameter.rowNum);
        var photoUrl  = e.parameter.photoUrl  !== undefined ? e.parameter.photoUrl  : "";
        var nameLao   = e.parameter.nameLao   !== undefined ? e.parameter.nameLao   : "";
        var nameEn    = e.parameter.nameEn    !== undefined ? e.parameter.nameEn    : "";
        var className = e.parameter.className !== undefined ? e.parameter.className : "";

        if (!rowNum || rowNum < 6) {
          var maxR = Math.max(targetSheet.getLastRow(), 50);
          var searchVals = targetSheet.getRange(6, 11, maxR, 2).getValues();
          for (var i = 0; i < searchVals.length; i++) {
            var nL = searchVals[i][0] ? searchVals[i][0].toString().trim() : "";
            var nE = searchVals[i][1] ? searchVals[i][1].toString().trim() : "";
            if ((nameLao && nL === nameLao.trim()) || (nameEn && nE === nameEn.trim())) {
              rowNum = i + 6;
              break;
            }
          }
        }

        if (rowNum && rowNum >= 6) {
          targetSheet.getRange(rowNum, 10, 1, 4).setValues([[photoUrl, nameLao, nameEn, className]]);
          SpreadsheetApp.flush();
          result = { status: "success", message: "ແກ້ໄຂຂໍ້ມູນນັກຮຽນສຳເລັດ", row: rowNum };
        } else {
          result = { status: "error", message: "ບໍ່ພົບແຖວທີ່ຈະແກ້ໄຂ" };
        }
      }
    }

    // --------------------------------------------------------
    // ACTION: DELETE STUDENT
    // --------------------------------------------------------
    else if (action === "deleteStudent") {
      var sheetName = e.parameter.sheet;
      var targetSheet = sheetName ? ss.getSheetByName(sheetName) : ss.getSheets()[0];
      if (!targetSheet) {
        result = { status: "error", message: "ບໍ່ພົບ Sheet Tab: " + sheetName };
      } else {
        var rowNum = parseInt(e.parameter.row) || parseInt(e.parameter.rowNum);
        var nameLao = e.parameter.nameLao || "";
        var nameEn  = e.parameter.nameEn  || "";

        if (!rowNum || rowNum < 6) {
          var lastR = targetSheet.getLastRow();
          var names = targetSheet.getRange(6, 11, Math.max(lastR - 5, 50), 2).getValues();
          for (var i = 0; i < names.length; i++) {
            var nL = names[i][0] ? names[i][0].toString().trim() : "";
            var nE = names[i][1] ? names[i][1].toString().trim() : "";
            if ((nameLao && nL === nameLao.trim()) || (nameEn && nE === nameEn.trim())) {
              rowNum = i + 6;
              break;
            }
          }
        }

        if (rowNum && rowNum >= 6) {
          targetSheet.getRange(rowNum, 10, 1, 8).clearContent();
          SpreadsheetApp.flush();
          result = { status: "success", message: "ລຶບຂໍ້ມູນນັກຮຽນສຳເລັດ", row: rowNum };
        } else {
          result = { status: "error", message: "ບໍ່ພົບແຖວທີ່ຈະລຶບ" };
        }
      }
    }

    // --------------------------------------------------------
    // ACTION: ADD ANNOUNCEMENT
    // --------------------------------------------------------
    else if (action === "addAnnouncement") {
      var sheetName = e.parameter.sheet;
      var targetSheet = sheetName ? ss.getSheetByName(sheetName) : ss.getSheets()[0];
      if (!targetSheet) {
        result = { status: "error", message: "ບໍ່ພົບ Sheet Tab: " + sheetName };
      } else {
        var annDate  = e.parameter.date    || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
        var annType  = e.parameter.type    || "ທົ່ວໄປ";
        var annTitle = e.parameter.title   || "";
        var annBody  = e.parameter.content || "";

        var maxR = Math.max(targetSheet.getLastRow() + 10, 50);
        var annRange = targetSheet.getRange(6, 19, maxR, 4).getValues();
        var targetRow = 6 + annRange.length;
        for (var i = 0; i < annRange.length; i++) {
          var titleVal = annRange[i][2] ? annRange[i][2].toString().trim() : "";
          var contentVal = annRange[i][3] ? annRange[i][3].toString().trim() : "";
          if (titleVal === "" && contentVal === "") {
            targetRow = i + 6;
            break;
          }
        }

        targetSheet.getRange(targetRow, 19, 1, 4).setValues([[annDate, annType, annTitle, annBody]]);
        SpreadsheetApp.flush();
        result = { status: "success", message: "ເພີ່ມແຈ້ງການສຳເລັດ", row: targetRow };
      }
    }

    // --------------------------------------------------------
    // ACTION: UPDATE / EDIT ANNOUNCEMENT
    // --------------------------------------------------------
    else if (action === "updateAnnouncement" || action === "editAnnouncement") {
      var sheetName = e.parameter.sheet;
      var targetSheet = sheetName ? ss.getSheetByName(sheetName) : ss.getSheets()[0];
      if (!targetSheet) {
        result = { status: "error", message: "ບໍ່ພົບ Sheet Tab: " + sheetName };
      } else {
        var rowNum   = parseInt(e.parameter.row) || parseInt(e.parameter.rowNum);
        var annDate  = e.parameter.date    || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
        var annType  = e.parameter.type    || "ທົ່ວໄປ";
        var annTitle = e.parameter.title   || "";
        var annBody  = e.parameter.content || "";

        if (!rowNum || rowNum < 6) {
          var maxR = Math.max(targetSheet.getLastRow(), 50);
          var titles = targetSheet.getRange(6, 21, maxR, 1).getValues();
          for (var i = 0; i < titles.length; i++) {
            var tVal = titles[i][0] ? titles[i][0].toString().trim() : "";
            if (annTitle && tVal === annTitle.trim()) {
              rowNum = i + 6;
              break;
            }
          }
        }

        if (rowNum && rowNum >= 6) {
          targetSheet.getRange(rowNum, 19, 1, 4).setValues([[annDate, annType, annTitle, annBody]]);
          SpreadsheetApp.flush();
          result = { status: "success", message: "ແກ້ໄຂແຈ້ງການສຳເລັດ", row: rowNum };
        } else {
          result = { status: "error", message: "ບໍ່ພົບແຖວທີ່ຈະແກ້ໄຂ" };
        }
      }
    }

    // --------------------------------------------------------
    // ACTION: DELETE ANNOUNCEMENT
    // --------------------------------------------------------
    else if (action === "deleteAnnouncement") {
      var sheetName = e.parameter.sheet;
      var targetSheet = sheetName ? ss.getSheetByName(sheetName) : ss.getSheets()[0];
      if (!targetSheet) {
        result = { status: "error", message: "ບໍ່ພົບ Sheet Tab: " + sheetName };
      } else {
        var rowNum = parseInt(e.parameter.row) || parseInt(e.parameter.rowNum);
        var title  = e.parameter.title || "";

        if (!rowNum || rowNum < 6) {
          var maxR = Math.max(targetSheet.getLastRow(), 50);
          var titles = targetSheet.getRange(6, 21, maxR, 1).getValues();
          for (var i = 0; i < titles.length; i++) {
            var tVal = titles[i][0] ? titles[i][0].toString().trim() : "";
            if (title && tVal === title.trim()) {
              rowNum = i + 6;
              break;
            }
          }
        }

        if (rowNum && rowNum >= 6) {
          targetSheet.getRange(rowNum, 19, 1, 4).clearContent();
          SpreadsheetApp.flush();
          result = { status: "success", message: "ລຶບແຈ້ງການສຳເລັດ", row: rowNum };
        } else {
          result = { status: "error", message: "ບໍ່ພົບແຖວທີ່ຈະລຶບ" };
        }
      }
    }

    // --------------------------------------------------------
    // ACTION: GET SCHEDULE
    // --------------------------------------------------------
    else if (action === "getSchedule" || action === "schedule") {
      var sheetName = e.parameter.sheet;
      var targetSheet = sheetName ? ss.getSheetByName(sheetName) : ss.getSheets()[0];
      if (!targetSheet) {
        result = { status: "error", message: "ບໍ່ພົບ Sheet Tab: " + sheetName };
      } else {
        var studySchedule = emptySchedule_();
        var maxR1 = Math.max(targetSheet.getLastRow() - 3, 50);
        var stValues = targetSheet.getRange(4, 24, maxR1, 6).getValues();
        studySchedule = parseScheduleGrid_(stValues);

        var teachingSchedule = emptySchedule_();
        var maxR2 = Math.max(targetSheet.getLastRow() - 3, 50);
        var tcValues = targetSheet.getRange(4, 31, maxR2, 6).getValues();
        teachingSchedule = parseScheduleGrid_(tcValues);

        result = {
          status: "success",
          sheet: targetSheet.getName(),
          studySchedule: studySchedule,
          teachingSchedule: teachingSchedule
        };
      }
    }

    // --------------------------------------------------------
    // ACTION: GET SCORE LINKS
    // --------------------------------------------------------
    else if (action === "getScoreLinks" || action === "scoreLinks") {
      var sheetName = e.parameter.sheet;
      var targetSheet = sheetName ? ss.getSheetByName(sheetName) : ss.getSheets()[0];
      if (!targetSheet) {
        result = { status: "error", message: "ບໍ່ພົບ Sheet Tab: " + sheetName };
      } else {
        var scoreLinks = {
          "ອ1": "", "ອ2": "", "ອ3": "",
          "ປ1": "", "ປ2": "", "ປ3": "", "ປ4": "", "ປ5": "",
          "ມ1": "", "ມ2": "", "ມ3": "", "ມ4": "", "ມ5": "", "ມ6": "", "ມ7": "",
          "rules": "", "other": ""
        };
        try {
          var row2 = targetSheet.getRange("A2:Y2").getValues()[0];
          if (row2) {
            scoreLinks["ອ1"] = row2[4] ? row2[4].toString() : "";  // Col E
            scoreLinks["ອ2"] = row2[5] ? row2[5].toString() : "";  // Col F
            scoreLinks["ອ3"] = row2[6] ? row2[6].toString() : "";  // Col G
            
            scoreLinks["ປ1"] = row2[8] ? row2[8].toString() : "";  // Col I
            scoreLinks["ປ2"] = row2[9] ? row2[9].toString() : "";  // Col J
            scoreLinks["ປ3"] = row2[10] ? row2[10].toString() : "";// Col K
            scoreLinks["ປ4"] = row2[11] ? row2[11].toString() : "";// Col L
            scoreLinks["ປ5"] = row2[12] ? row2[12].toString() : "";// Col M
            
            scoreLinks["ມ1"] = row2[14] ? row2[14].toString() : "";// Col O
            scoreLinks["ມ2"] = row2[15] ? row2[15].toString() : "";// Col P
            scoreLinks["ມ3"] = row2[16] ? row2[16].toString() : "";// Col Q
            scoreLinks["ມ4"] = row2[17] ? row2[17].toString() : "";// Col R
            scoreLinks["ມ5"] = row2[18] ? row2[18].toString() : "";// Col S
            scoreLinks["ມ6"] = row2[19] ? row2[19].toString() : "";// Col T
            scoreLinks["ມ7"] = row2[20] ? row2[20].toString() : "";// Col U
            
            scoreLinks["rules"] = row2[23] ? row2[23].toString() : "";// Col X
            scoreLinks["other"] = row2[24] ? row2[24].toString() : "";// Col Y (ຄະແນນອື່ນໆ)
          }
        } catch(ex) {}

        result = {
          status: "success",
          sheet: targetSheet.getName(),
          scoreLinks: scoreLinks
        };
      }
    }

    // --------------------------------------------------------
    // ACTION: GET ATTENDANCE LINKS
    // --------------------------------------------------------
    else if (action === "getAttendanceLinks" || action === "attendanceLinks") {
      var sheetName = e.parameter.sheet;
      var targetSheet = sheetName ? ss.getSheetByName(sheetName) : ss.getSheets()[0];
      if (!targetSheet) {
        result = { status: "error", message: "ບໍ່ພົບ Sheet Tab: " + sheetName };
      } else {
        var attendanceLinks = {
          "ອ1": "", "ອ2": "", "ອ3": "",
          "ປ1": "", "ປ2": "", "ປ3": "", "ປ4": "", "ປ5": "",
          "ມ1": "", "ມ2": "", "ມ3": "", "ມ4": "", "ມ5": "", "ມ6": "", "ມ7": "",
          "rules": ""
        };
        try {
          var row3 = targetSheet.getRange("A3:X3").getValues()[0];
          if (row3) {
            attendanceLinks["ອ1"] = row3[4] ? row3[4].toString() : "";  // Col E
            attendanceLinks["ອ2"] = row3[5] ? row3[5].toString() : "";  // Col F
            attendanceLinks["ອ3"] = row3[6] ? row3[6].toString() : "";  // Col G
            
            attendanceLinks["ປ1"] = row3[8] ? row3[8].toString() : "";  // Col I
            attendanceLinks["ປ2"] = row3[9] ? row3[9].toString() : "";  // Col J
            attendanceLinks["ປ3"] = row3[10] ? row3[10].toString() : "";// Col K
            attendanceLinks["ປ4"] = row3[11] ? row3[11].toString() : "";// Col L
            attendanceLinks["ປ5"] = row3[12] ? row3[12].toString() : "";// Col M
            
            attendanceLinks["ມ1"] = row3[14] ? row3[14].toString() : "";// Col O
            attendanceLinks["ມ2"] = row3[15] ? row3[15].toString() : "";// Col P
            attendanceLinks["ມ3"] = row3[16] ? row3[16].toString() : "";// Col Q
            attendanceLinks["ມ4"] = row3[17] ? row3[17].toString() : "";// Col R
            attendanceLinks["ມ5"] = row3[18] ? row3[18].toString() : "";// Col S
            attendanceLinks["ມ6"] = row3[19] ? row3[19].toString() : "";// Col T
            attendanceLinks["ມ7"] = row3[20] ? row3[20].toString() : "";// Col U
            
            attendanceLinks["rules"] = row3[23] ? row3[23].toString() : "";// Col X
          }
        } catch(ex) {}

        result = {
          status: "success",
          sheet: targetSheet.getName(),
          attendanceLinks: attendanceLinks
        };
      }
    }

    // --------------------------------------------------------
    // ACTION: GET STUDENTS
    // --------------------------------------------------------
    else if (action === "getStudents" || action === "students") {
      var sheetName = e.parameter.sheet;
      var targetSheet = sheetName ? ss.getSheetByName(sheetName) : ss.getSheets()[0];
      if (!targetSheet) {
        result = { status: "error", message: "ບໍ່ພົບ Sheet Tab: " + sheetName };
      } else {
        var lastRow = targetSheet.getLastRow();
        var students = [];
        if (lastRow >= 6) {
          var studentValues = targetSheet.getRange(6, 10, lastRow - 5, 8).getValues();
          students = studentValues.map(function(row, idx) {
            var photo = row[0] ? row[0].toString().trim() : "";       // Col J
            var nameLao = row[1] ? row[1].toString().trim() : "";     // Col K
            var nameEn = row[2] ? row[2].toString().trim() : "";      // Col L
            var className = row[3] ? row[3].toString().trim() : "";   // Col M
            var kindergarten = row[5] ? row[5].toString().trim() : "";// Col O
            var primary = row[6] ? row[6].toString().trim() : "";     // Col P
            var secondary = row[7] ? row[7].toString().trim() : "";   // Col Q

            return {
              id: idx + 1,
              rowNum: idx + 6,
              photoUrl: photo,
              nameLao: nameLao,
              nameEn: nameEn,
              className: className || kindergarten || primary || secondary || "—",
              kindergarten: kindergarten,
              primary: primary,
              secondary: secondary
            };
          }).filter(function(s) {
            return s.nameLao || s.nameEn || s.photoUrl || s.className !== "—" || s.kindergarten || s.primary || s.secondary;
          });
        }
        result = {
          status: "success",
          sheet: targetSheet.getName(),
          students: students
        };
      }
    }

    // --------------------------------------------------------
    // ACTION: GET TEACHERS
    // --------------------------------------------------------
    else if (action === "getTeachers" || action === "teachers") {
      var sheetName = e.parameter.sheet;
      var targetSheet = sheetName ? ss.getSheetByName(sheetName) : ss.getSheets()[0];
      if (!targetSheet) {
        result = { status: "error", message: "ບໍ່ພົບ Sheet Tab: " + sheetName };
      } else {
        var lastRow = targetSheet.getLastRow();
        var teachers = [];
        if (lastRow >= 6) {
          var teacherValues = targetSheet.getRange(6, 2, lastRow - 5, 6).getValues();
          teachers = teacherValues.map(function(row, idx) {
            return {
              id: idx + 1,
              rowNum: idx + 6,
              photoUrl: row[0] ? row[0].toString().trim() : "", // Col B
              nameLao:  row[1] ? row[1].toString().trim() : "", // Col C
              nameEn:   row[2] ? row[2].toString().trim() : "", // Col D
              position: row[3] ? row[3].toString().trim() : "", // Col E
              subject:  row[4] ? row[4].toString().trim() : "", // Col F
              phone:    row[5] ? row[5].toString().trim() : ""  // Col G
            };
          }).filter(function(t) {
            return t.nameLao || t.nameEn || t.photoUrl || t.position || t.subject;
          });
        }
        result = {
          status: "success",
          sheet: targetSheet.getName(),
          teachers: teachers
        };
      }
    }

    // --------------------------------------------------------
    // ACTION: GET SCHEDULE GRID (ຂໍ້ມູນດິບ + ພິກັດແຖວ/ຄໍລຳແທ້ຂອງ Sheet)
    // --------------------------------------------------------
    else if (action === "getScheduleGrid") {
      var sheetName = e.parameter.sheet;
      var targetSheet = sheetName ? ss.getSheetByName(sheetName) : ss.getSheets()[0];
      if (!targetSheet) {
        result = { status: "error", message: "ບໍ່ພົບ Sheet Tab: " + sheetName };
      } else {
        var maxRG = Math.max(targetSheet.getLastRow() - 3, 50);
        result = {
          status: "success",
          action: "getScheduleGrid",
          sheet: targetSheet.getName(),
          study: { startRow: 4, startCol: 24, values: scheduleGridValues_(targetSheet, 24, maxRG) },
          teach: { startRow: 4, startCol: 31, values: scheduleGridValues_(targetSheet, 31, maxRG) }
        };
      }
    }

    // --------------------------------------------------------
    // ACTION: SAVE SCHEDULE CELLS (admin inline editing)
    // cells = [{ kind:'study'|'teach', row:<ແຖວ Sheet>, col:<0..5>, value:<ຂໍ້ຄວາມ> }]
    // --------------------------------------------------------
    else if (action === "saveScheduleCells") {
      var sheetName = e.parameter.sheet;
      var targetSheet = sheetName ? ss.getSheetByName(sheetName) : ss.getSheets()[0];
      var cells = [];
      try { cells = JSON.parse(e.parameter.cells || "[]"); } catch (err) { cells = []; }

      if (!targetSheet) {
        result = { status: "error", message: "ບໍ່ພົບ Sheet Tab: " + sheetName };
      } else if (!cells.length || cells.length > 500) {
        result = { status: "error", message: "ບໍ່ມີຂໍ້ມູນທີ່ແກ້ໄຂ ຫຼືຈຳນວນຫຼາຍເກີນໄປ" };
      } else {
        var saved = 0;
        var lastRow = targetSheet.getLastRow();
        cells.forEach(function(item) {
          var kind = String(item.kind || "");
          var baseCol = kind === "teach" ? 31 : (kind === "study" ? 24 : -1);
          var row = Number(item.row);
          var colOffset = Number(item.col);
          if (baseCol > 0 && Number.isInteger(row) && row >= 4 && row <= lastRow &&
              Number.isInteger(colOffset) && colOffset >= 0 && colOffset <= 5) {
            targetSheet.getRange(row, baseCol + colOffset).setValue(item.value == null ? "" : String(item.value));
            saved++;
          }
        });
        SpreadsheetApp.flush();
        result = { status: "success", action: "saveScheduleCells", saved: saved };
      }
    }

    // --------------------------------------------------------
    // ACTION: GET SHEET TABS OF A LINKED SPREADSHEET
    // ໃຊ້ໂດຍໜ້າຕາຕະລາງຄະແນນ / ຕິດຕາມການມາຮຽນ:
    // ເມື່ອປ່ຽນຊື່ tab ໃໝ່ ແອັບຈະຖາມລາຍຊື່ຈາກທີ່ນີ້ ແທນການເດົາຊື່ເກົ່າ.
    // --------------------------------------------------------
    else if (action === "getSpreadsheetTabs") {
      var rawUrl = (e.parameter.url || e.parameter.id || "").toString().trim();
      var tabId = "";
      var tabMatch = rawUrl.match(/\/d\/([A-Za-z0-9_-]{10,})/);
      if (tabMatch) {
        tabId = tabMatch[1];
      } else if (/^[A-Za-z0-9_-]{10,}$/.test(rawUrl)) {
        tabId = rawUrl;
      }

      if (!tabId) {
        result = { status: "error", message: "Invalid spreadsheet URL" };
      } else {
        try {
          var linkedSs = SpreadsheetApp.openById(tabId);
          var tabs = linkedSs.getSheets().map(function(sh) {
            return sh.getName();
          }).filter(function(n) { return n && n.toString().trim() !== ""; });
          result = { status: "success", spreadsheetId: tabId, tabs: tabs };
        } catch (tabErr) {
          result = { status: "error", message: "Cannot open spreadsheet: " + tabErr.toString() };
        }
      }
    }

    // --------------------------------------------------------
    // DEFAULT
    // --------------------------------------------------------
    else {
      var sheetsDef = ss.getSheets();
      var namesDef = sheetsDef.map(function(s) { return s.getName(); });
      result = {
        status: "success",
        sheets: namesDef
      };
    }

    // Support JSONP for bulletproof browser requests
    var callback = e && e.parameter && e.parameter.callback;
    if (callback) {
      return ContentService
        .createTextOutput(callback + "(" + JSON.stringify(result) + ");")
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    } else {
      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

  } catch (error) {
    var errorResult = {
      status: "error",
      message: error.toString()
    };
    var callbackErr = e && e.parameter && e.parameter.callback;
    if (callbackErr) {
      return ContentService
        .createTextOutput(callbackErr + "(" + JSON.stringify(errorResult) + ");")
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    } else {
      return ContentService
        .createTextOutput(JSON.stringify(errorResult))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
}
