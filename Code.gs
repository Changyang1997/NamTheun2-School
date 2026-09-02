/**
 * ====================================================================
 * Google Apps Script for Nam Theun 2 School Management System
 * Spreadsheet ID: 1hamFjOzjlaq_sa3BY7WFgZhELXMboJHBt4S_D3HdRfY
 * 
 * ວິທີນຳໃຊ້:
 * 1. ເປີດ Google Sheet: 1hamFjOzjlaq_sa3BY7WFgZhELXMboJHBt4S_D3HdRfY
 * 2. ໄປທີ່ເມນູ: Extensions (ສ່ວນຂະຫຍາຍ) -> Apps Script
 * 3. ກັອບປີ້ Code ທັງໝົດນີ້ໄປວາງໃສ່ Code.gs
 * 4. ກົດ Save (ບັນທຶກ)
 * 5. ກົດ Deploy -> Manage deployments -> Edit -> New version -> Deploy
 * ====================================================================
 */

const SPREADSHEET_ID = "1hamFjOzjlaq_sa3BY7WFgZhELXMboJHBt4S_D3HdRfY";

function doGet(e) {
  try {
    var ss;
    try {
      ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    } catch(err) {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    }

    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "getSheets";
    var result = {};

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
          "rules": ""
        };
        
        try {
          var range = sheet.getRange("A2:X2").getValues();
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
          }
        } catch(ex) {}

        // ດຶງຂໍ້ມູນຄູອາຈານເລີ່ມແຕ່ແຖວທີ 6 (B6:G) - ໂດຍສະເພາະ Col D6 ເປັນຕົ້ນໄປ
        var teachers = [];
        try {
          var lastRowT = sheet.getLastRow();
          if (lastRowT >= 6) {
            var teacherValues = sheet.getRange(6, 2, lastRowT - 5, 6).getValues();
            teachers = teacherValues.map(function(row, idx) {
              return {
                id: idx + 1,
                photoUrl: row[0] ? row[0].toString() : "", // Col B
                nameLao:  row[1] ? row[1].toString() : "", // Col C
                nameEn:   row[2] ? row[2].toString() : "", // Col D
                position: row[3] ? row[3].toString() : "", // Col E
                subject:  row[4] ? row[4].toString() : "", // Col F
                phone:    row[5] ? row[5].toString() : ""  // Col G
              };
            }).filter(function(t) {
              return t.nameLao || t.nameEn || t.photoUrl || t.position || t.subject;
            });
          }
        } catch(ex) {}

        // ດຶງຂໍ້ມູນນັກຮຽນເລີ່ມແຕ່ແຖວທີ 6 (J6:Q) - ໂດຍສະເພາະ Col K6 ເປັນຕົ້ນໄປ
        var students = [];
        try {
          var lastRowS = sheet.getLastRow();
          if (lastRowS >= 6) {
            var studentValues = sheet.getRange(6, 10, lastRowS - 5, 8).getValues();
            students = studentValues.map(function(row, idx) {
              var photo = row[0] ? row[0].toString() : "";       // Col J
              var nameLao = row[1] ? row[1].toString() : "";     // Col K
              var nameEn = row[2] ? row[2].toString() : "";      // Col L
              var className = row[3] ? row[3].toString() : "";   // Col M
              var kindergarten = row[5] ? row[5].toString() : "";// Col O
              var primary = row[6] ? row[6].toString() : "";     // Col P
              var secondary = row[7] ? row[7].toString() : "";   // Col Q

              return {
                id: idx + 1,
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

        // 1. ດຶງຂໍ້ມູນຕາຕະລາງຮຽນນັກຮຽນ (Col X:AC = Col 24..29, Row 6+)
        var studySchedule = [];
        try {
          var maxR1 = Math.max(sheet.getLastRow() - 5, 50);
          var stValues = sheet.getRange(6, 24, maxR1, 6).getValues();
          stValues.forEach(function(row) {
            var stTime = row[0] ? row[0].toString().trim() : "";
            var stMon  = row[1] ? row[1].toString().trim() : "";
            var stTue  = row[2] ? row[2].toString().trim() : "";
            var stWed  = row[3] ? row[3].toString().trim() : "";
            var stThu  = row[4] ? row[4].toString().trim() : "";
            var stFri  = row[5] ? row[5].toString().trim() : "";

            if (stTime || stMon || stTue || stWed || stThu || stFri) {
              studySchedule.push({
                time: stTime,
                mon: stMon,
                tue: stTue,
                wed: stWed,
                thu: stThu,
                fri: stFri,
                isBreak: stMon.indexOf('ພັກ') !== -1 || stTime.indexOf('ພັກ') !== -1
              });
            }
          });
        } catch(ex) {}

        // 2. ດຶງຂໍ້ມູນຕາຕະລາງສອນຄູອາຈານ (Col AE:AJ = Col 31..36, Row 6+)
        var teachingSchedule = [];
        try {
          var maxR2 = Math.max(sheet.getLastRow() - 5, 50);
          var tcValues = sheet.getRange(6, 31, maxR2, 6).getValues();
          tcValues.forEach(function(row) {
            var tcTime = row[0] ? row[0].toString().trim() : "";
            var tcMon  = row[1] ? row[1].toString().trim() : "";
            var tcTue  = row[2] ? row[2].toString().trim() : "";
            var tcWed  = row[3] ? row[3].toString().trim() : "";
            var tcThu  = row[4] ? row[4].toString().trim() : "";
            var tcFri  = row[5] ? row[5].toString().trim() : "";

            if (tcTime || tcMon || tcTue || tcWed || tcThu || tcFri) {
              teachingSchedule.push({
                time: tcTime,
                mon: tcMon,
                tue: tcTue,
                wed: tcWed,
                thu: tcThu,
                fri: tcFri,
                isBreak: tcMon.indexOf('ພັກ') !== -1 || tcTime.indexOf('ພັກ') !== -1
              });
            }
          });
        } catch(ex) {}

        return {
          name: name,
          logo: logo,
          schoolName: schoolName,
          subtitle: subtitle,
          scoreLinks: scoreLinks,
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
    else if (action === "getSchedule" || action === "schedule") {
      var sheetName = e.parameter.sheet;
      var targetSheet = sheetName ? ss.getSheetByName(sheetName) : ss.getSheets()[0];
      if (!targetSheet) {
        result = { status: "error", message: "ບໍ່ພົບ Sheet Tab: " + sheetName };
      } else {
        var studySchedule = [];
        var maxR1 = Math.max(targetSheet.getLastRow() - 5, 50);
        var stValues = targetSheet.getRange(6, 24, maxR1, 6).getValues();
        stValues.forEach(function(row) {
          var stTime = row[0] ? row[0].toString().trim() : "";
          var stMon  = row[1] ? row[1].toString().trim() : "";
          var stTue  = row[2] ? row[2].toString().trim() : "";
          var stWed  = row[3] ? row[3].toString().trim() : "";
          var stThu  = row[4] ? row[4].toString().trim() : "";
          var stFri  = row[5] ? row[5].toString().trim() : "";

          if (stTime || stMon || stTue || stWed || stThu || stFri) {
            studySchedule.push({
              time: stTime,
              mon: stMon,
              tue: stTue,
              wed: stWed,
              thu: stThu,
              fri: stFri,
              isBreak: stMon.indexOf('ພັກ') !== -1 || stTime.indexOf('ພັກ') !== -1
            });
          }
        });

        var teachingSchedule = [];
        var maxR2 = Math.max(targetSheet.getLastRow() - 5, 50);
        var tcValues = targetSheet.getRange(6, 31, maxR2, 6).getValues();
        tcValues.forEach(function(row) {
          var tcTime = row[0] ? row[0].toString().trim() : "";
          var tcMon  = row[1] ? row[1].toString().trim() : "";
          var tcTue  = row[2] ? row[2].toString().trim() : "";
          var tcWed  = row[3] ? row[3].toString().trim() : "";
          var tcThu  = row[4] ? row[4].toString().trim() : "";
          var tcFri  = row[5] ? row[5].toString().trim() : "";

          if (tcTime || tcMon || tcTue || tcWed || tcThu || tcFri) {
            teachingSchedule.push({
              time: tcTime,
              mon: tcMon,
              tue: tcTue,
              wed: tcWed,
              thu: tcThu,
              fri: tcFri,
              isBreak: tcMon.indexOf('ພັກ') !== -1 || tcTime.indexOf('ພັກ') !== -1
            });
          }
        });

        result = {
          status: "success",
          sheet: targetSheet.getName(),
          studySchedule: studySchedule,
          teachingSchedule: teachingSchedule
        };
      }
    }
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
          "rules": ""
        };
        try {
          var row2 = targetSheet.getRange("A2:X2").getValues()[0];
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
          }
        } catch(ex) {}

        result = {
          status: "success",
          sheet: targetSheet.getName(),
          scoreLinks: scoreLinks
        };
      }
    }
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
            var photo = row[0] ? row[0].toString() : "";       // Col J
            var nameLao = row[1] ? row[1].toString() : "";     // Col K
            var nameEn = row[2] ? row[2].toString() : "";      // Col L
            var className = row[3] ? row[3].toString() : "";   // Col M
            var kindergarten = row[5] ? row[5].toString() : "";// Col O
            var primary = row[6] ? row[6].toString() : "";     // Col P
            var secondary = row[7] ? row[7].toString() : "";   // Col Q

            return {
              id: idx + 1,
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
              photoUrl: row[0] ? row[0].toString() : "", // Col B
              nameLao:  row[1] ? row[1].toString() : "", // Col C
              nameEn:   row[2] ? row[2].toString() : "", // Col D
              position: row[3] ? row[3].toString() : "", // Col E
              subject:  row[4] ? row[4].toString() : "", // Col F
              phone:    row[5] ? row[5].toString() : ""  // Col G
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
    else if (action === "getSchoolInfo") {
      var sheetName = e.parameter.sheet;
      var targetSheet = sheetName ? ss.getSheetByName(sheetName) : ss.getSheets()[0];
      if (!targetSheet) {
        result = { status: "error", message: "ບໍ່ພົບ Sheet Tab: " + sheetName };
      } else {
        var range = targetSheet.getRange("A2:C2").getValues();
        var logo = range && range[0] && range[0][0] ? range[0][0].toString() : "";
        var schoolName = range && range[0] && range[0][1] ? range[0][1].toString() : "";
        var subtitle = range && range[0] && range[0][2] ? range[0][2].toString() : "";

        result = {
          status: "success",
          sheet: targetSheet.getName(),
          logo: logo,
          schoolName: schoolName,
          subtitle: subtitle
        };
      }
    }
    else if (action === "getData") {
      var sheetName = e.parameter.sheet;
      var targetSheet = sheetName ? ss.getSheetByName(sheetName) : ss.getSheets()[0];
      
      if (!targetSheet) {
        result = { status: "error", message: "ບໍ່ພົບ Sheet Tab: " + sheetName };
      } else {
        var data = targetSheet.getDataRange().getValues();
        if (data.length > 0) {
          var headers = data[0];
          var rows = data.slice(1).map(function(row) {
            var obj = {};
            headers.forEach(function(header, idx) {
              if (header) obj[header] = row[idx];
            });
            return obj;
          });
          result = { status: "success", sheet: targetSheet.getName(), data: rows };
        } else {
          result = { status: "success", sheet: targetSheet.getName(), data: [] };
        }
      }
    } 
    else {
      var sheetsDef = ss.getSheets();
      var namesDef = sheetsDef.map(function(s) { return s.getName(); });
      result = {
        status: "success",
        sheets: namesDef
      };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    var errorResult = {
      status: "error",
      message: error.toString()
    };
    return ContentService
      .createTextOutput(JSON.stringify(errorResult))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
