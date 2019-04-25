
'use strict';


const WIN = require("ui/window");
const LANG = require('./language/');
const LANG_T = antSword['language']['toastr'];
const fs = require('fs');
const dialog = antSword.remote.dialog;

/**
 * 插件类
*/
class Plugin {
  constructor(opt) {
    this.win = new WIN({
      title: `${LANG['title']}`,
      width: 800,
      height: 600,
    });
    this.createMainLayout();
  }

  createMainLayout() {
    let layout = this.win.win.attachLayout({
      pattern: "2E",
      cells: [{
        id: "a",
        header: false,
        height: 90,
        collapse: false
      }, {
        id: "b",
        header: false,
        collapse: false
      }]
    });
    this.createFileForm(layout.cells('a'));
    this.createShellGrid(layout.cells('b'));
    this.layout = layout;
  }

  createFileForm(cell) {
    let fileForm = cell.attachForm();
    fileForm.loadStruct([{
      type: "fieldset",
      width: "100%",
      label: LANG['form']['title'],
      list: [{
        type: "settings",
        labelWidth: 50,
        inputWidth: 470,
      }, {
        type: "input",
        name: "filepath",
        label: LANG['form']['path'],
        position: "label-left",
        value: ""
      }, {
        type: "newcolumn",
        offset: 20
      }, {
        type: "button",
        name: "choose",
        width: 80,
        value: LANG['form']['choose']
      }, {
        type: "newcolumn",
        offset: 20
      }, {
        type: "button",
        name: "import",
        width: 80,
        value: LANG['form']['import'],
        disabled: true
      }]
    }, , {
      type: "input",
      rows: 10,
      style: "font-size: 20px;text-align: center;color: black;",
      disabled: true,
      offsetTop: 100,
      inputWidth: 600,
      readonly: true,
      value: Buffer.from('5L2g5bCx566X5piv5Y+R546w6L+Z5Liq5b2p6JuL5Lmf5rKh55So77yMDQrmiJHkuI3kvJrllLHvvIzot7PvvIxSQVDvvIzwn4+A77yM55yf55qE6YO95LiN5Lya77yB77yB77yBDQrmrKLov47lhYnkuLQg5oiR55qE5Y2a5a6iIGh0dHBzOi8vd3d3LnZpcnp6LmNvbQo=', 'base64').toString()
    }]);
    var self = this;
    fileForm.attachEvent("onButtonClick", (id) => {
      if (id == "import") {
        self.importShellDataToDb();
      } else if (id == 'choose') {
        dialog.showOpenDialog({
          properties: ['openFile']
        }, (_filePath) => {
          _filePath = typeof _filePath == "object" && _filePath.length > 0 ? _filePath[0] : "";
          if (fs.existsSync(_filePath)) {
            self.shellData = fs.readFileSync(_filePath, { encoding: 'utf-8' });
            self.insertShellDataToGrid()
            self.fileForm.setItemValue("filepath", _filePath);
          }
        })
      }
    });
    this.fileForm = fileForm;
  }

  createShellGrid(cell) {
    let shellGrid = cell.attachGrid();
    shellGrid.setHeader(`
      ${LANG['grid']['header']['note']},
      ${LANG['grid']['header']['cate']},
      ${LANG['grid']['header']['pass']},
      ${LANG['grid']['header']['type']},
      ${LANG['grid']['header']['url']}
    `);
    shellGrid.setColTypes("ro,ro,ro,ro,ro");
    shellGrid.setColSorting('str,str,str,str,str');
    shellGrid.setInitWidths("120,100,120,80,*");
    shellGrid.setColAlign("center,center,center,center,left");
    shellGrid.init();
    // TODO: 动态删除或者修改导入错误的数据
    this.shellGrid = shellGrid;
  }

  insertShellDataToGrid() {
    this.shellGrid.clearAll();
    this.win.win.progressOn();
    try {
      this.shellGrid.parse(this.shellData, 'csv');
      this.fileForm.enableItem("import")
      toastr.success(LANG['success'], LANG_T['success']);
    } catch (error) {
      toastr.error(`${LANG['error']['parse']} Error : ${error}`, LANG_T['error']);
    }
    this.win.win.progressOff();
  }

  importShellDataToDb() {
    let grid = this.shellGrid;
    var log = {
      success: [],
      error: []
    }
    this.win.win.progressOn();
    grid.getAllRowIds().split(",").map((id) => {
      let type = grid.cells(id, 3).getValue();
      let data = {
        'url': grid.cells(id, 4).getValue(),
        'category': grid.cells(id, 1).getValue(),
        'pwd': grid.cells(id, 2).getValue(),
        'type': (type != "php" && type != "asp" && type != "aspx" && type != "custom") ? type : "custom",
        'note': grid.cells(id, 0).getValue()
      }
      let ret = antSword.ipcRenderer.sendSync('shell-add', { base: data });
      (ret instanceof Object) ? log.success.push(data['url']) : log.success.push(data['url']);
    });
    // 成功与失败的通知
    if (log.error.length > 0) {
      toastr.error(`${LANG['error']['import']} -> Count : ${log.error.length}`, LANG_T['error']);
    }
    if (log.success.length > 0) {
      toastr.success(`${LANG['success']} -> Count : ${log.success.length}`, LANG_T['success']);
    }
    // 重新载入 Shell 数据
    antSword.modules.shellmanager.reloadData({ 'category': 'default' });
    this.win.win.progressOff();
  }
}

module.exports = Plugin;