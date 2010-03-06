function DataTableCellUI(dataTableView, cell, rowIndex, cellIndex, td) {
    this._dataTableView = dataTableView;
    this._cell = cell;
    this._rowIndex = rowIndex;
    this._cellIndex = cellIndex;
    this._td = td;
    
    this._render();
};

DataTableCellUI.prototype._render = function() {
    var self = this;
    var cell = this._cell;
    
    var divContent = $('<div/>')
        .addClass("data-table-cell-content");
        
    var editLink = $('<a href="javascript:{}" />')
        .addClass("data-table-cell-edit")
        .text("edit")
        .appendTo(divContent)
        .click(function() { self._startEdit(this); });
        
    $(this._td).empty()
        .unbind()
        .mouseenter(function() { editLink.css("visibility", "visible"); })
        .mouseleave(function() { editLink.css("visibility", "hidden"); });
    
    if (cell == null || ("v" in cell && cell.v == null)) {
        $('<span>').html("&nbsp;").appendTo(divContent);
    } else if ("e" in cell) {
        $('<span>').addClass("data-table-error").text(cell.e).appendTo(divContent);
    } else if (!("r" in cell) || cell.r == null) {
        $('<span>').text(cell.v).appendTo(divContent);
    } else {
        var r = cell.r;
        if (r.j == "new") {
            $('<span>').text(cell.v + " (new topic) ").appendTo(divContent);
            
            $('<a href="javascript:{}">re-match</a>')
                .addClass("data-table-recon-action")
                .appendTo(divContent).click(function(evt) {
                    self._doRematch();
                });
        } else if (r.j == "matched" && "m" in r && r.m != null) {
            var match = cell.r.m;
            $('<a></a>')
                .text(match.name)
                .attr("href", "http://www.freebase.com/view" + match.id)
                .attr("target", "_blank")
                .appendTo(divContent);
                
            $('<span> </span>').appendTo(divContent);
            $('<a href="javascript:{}"></a>')
                .text("re-match")
                .addClass("data-table-recon-action")
                .appendTo(divContent)
                .click(function(evt) {
                    self._doRematch();
                });
        } else {
            $('<span>').text(cell.v).appendTo(divContent);
            
            if (this._dataTableView._showRecon) {
                var ul = $('<div></div>').addClass("data-table-recon-candidates").appendTo(divContent);
                if ("c" in r && r.c.length > 0) {
                    var candidates = r.c;
                    var renderCandidate = function(candidate, index) {
                        var li = $('<div></div>').addClass("data-table-recon-candidate").appendTo(ul);
                        
                        $('<a href="javascript:{}">&nbsp;</a>')
                            .addClass("data-table-recon-match-similar")
                            .attr("title", "Match this topic to this cell and other cells with the same content")
                            .appendTo(li).click(function(evt) {
                                self._doMatchTopicToSimilarCells(candidate);
                            });
                            
                        $('<a href="javascript:{}">&nbsp;</a>')
                            .addClass("data-table-recon-match")
                            .attr("title", "Match this topic to this cell")
                            .appendTo(li).click(function(evt) {
                                self._doMatchTopicToOneCell(candidate);
                            });
                            
                        $('<a></a>')
                            .addClass("data-table-recon-topic")
                            .attr("href", "http://www.freebase.com/view" + candidate.id)
                            .attr("target", "_blank")
                            .click(function(evt) {
                                self._previewCandidateTopic(candidate.id, this);
                                evt.preventDefault();
                                return false;
                            })
                            .text(candidate.name)
                            .appendTo(li);
                            
                        $('<span></span>').addClass("data-table-recon-score").text("(" + Math.round(candidate.score) + ")").appendTo(li);
                    };
                    
                    for (var i = 0; i < candidates.length; i++) {
                        renderCandidate(candidates[i], i);
                    }
                }
                
                var liNew = $('<div></div>').addClass("data-table-recon-candidate").appendTo(ul);
                $('<a href="javascript:{}">&nbsp;</a>')
                    .addClass("data-table-recon-match-similar")
                    .attr("title", "Create a new topic for this cell and other cells with the same content")
                    .appendTo(liNew).click(function(evt) {
                        self._doMatchNewTopicToSimilarCells();
                    });
                    
                $('<a href="javascript:{}">&nbsp;</a>')
                    .addClass("data-table-recon-match")
                    .attr("title", "Create a new topic for this cell")
                    .appendTo(liNew).click(function(evt) {
                        self._doMatchNewTopicToOneCell();
                    });
                    
                $('<span>').text("(New topic)").appendTo(liNew);
                
                $('<a href="javascript:{}"></a>')
                    .addClass("data-table-recon-search")
                    .click(function(evt) {
                        self._searchForMatch();
                        return false;
                    })
                    .text("search for match")
                    .appendTo($('<div>').appendTo(divContent));
            }
        }
    }
    
    divContent.appendTo(this._td)
};

DataTableCellUI.prototype._doRematch = function() {
    this._doJudgment("none");
};

DataTableCellUI.prototype._doMatchNewTopicToOneCell = function() {
    this._doJudgment("new");
};

DataTableCellUI.prototype._doMatchNewTopicToSimilarCells = function() {
    this._doJudgmentForSimilarCells("new", { shareNewTopics: true }, true);
};

DataTableCellUI.prototype._doMatchTopicToOneCell = function(candidate) {
    this._doJudgment("matched", {
        topicID : candidate.id,
        topicGUID: candidate.guid,
        topicName: candidate.name,
        score: candidate.score,
        types: candidate.types.join(",")
   });
};

DataTableCellUI.prototype._doMatchTopicToSimilarCells = function(candidate) {
    this._doJudgmentForSimilarCells("matched", {
        topicID : candidate.id,
        topicGUID: candidate.guid,
        topicName: candidate.name,
        score: candidate.score,
        types: candidate.types.join(",")
    }, true);
};

DataTableCellUI.prototype._doJudgment = function(judgment, params) {
    params = params || {};
    params.row = this._rowIndex;
    params.cell = this._cellIndex;
    params.judgment = judgment;
    this._postProcessOneCell("recon-judge-one-cell", params, true);
};

DataTableCellUI.prototype._doJudgmentForSimilarCells = function(judgment, params) {
    params = params || {};
    params.columnName = Gridworks.cellIndexToColumn(this._cellIndex).name;
    params.similarValue = this._cell.v;
    params.judgment = judgment;
    
    this._postProcessSeveralCells("recon-judge-similar-cells", params, true);
};

DataTableCellUI.prototype._searchForMatch = function() {
    var self = this;
    var frame = DialogSystem.createDialog();
    frame.width("400px");
    
    var header = $('<div></div>').addClass("dialog-header").text("Search for Match").appendTo(frame);
    var body = $('<div></div>').addClass("dialog-body").appendTo(frame);
    var footer = $('<div></div>').addClass("dialog-footer").appendTo(frame);
    
    $('<p></p>').text("Search Freebase for topic to match " + this._cell.v).appendTo(body);
    
    var input = $('<input />').attr("value", this._cell.v).appendTo($('<p></p>').appendTo(body));
    var match = null;
    input.suggest({}).bind("fb-select", function(e, data) {
        match = data;
    });
    
    var pSimilar = $('<p></p>').appendTo(body);
    var checkSimilar = $('<input type="checkbox" checked="true" />').appendTo(pSimilar);
    $('<span>').text(" Match other cells with the same content as well").appendTo(pSimilar);
    
    $('<button></button>').text("Match").click(function() {
        if (match != null) {
            var params = {
                judgment: "matched",
                topicID: match.id,
                topicGUID: match.guid,
                topicName: match.name,
                types: $.map(match.type, function(elmt) { return elmt.id; }).join(",")
            };
            if (checkSimilar[0].checked) {
                params.similarValue = self._cell.v;
                params.columnName = Gridworks.cellIndexToColumn(self._cellIndex).name;
                
                self._postProcessSeveralCells("recon-judge-similar-cells", params, true);
            } else {
                params.row = self._rowIndex;
                params.cell = self._cellIndex;
                
                self._postProcessOneCell("recon-judge-one-cell", params, true);
            }
        
            DialogSystem.dismissUntil(level - 1);
        }
    }).appendTo(footer);
    
    $('<button></button>').text("Cancel").click(function() {
        DialogSystem.dismissUntil(level - 1);
    }).appendTo(footer);
    
    var level = DialogSystem.showDialog(frame);
    input.focus().data("suggest").textchange();
};

DataTableCellUI.prototype._postProcessOneCell = function(command, params, columnStatsChanged) {
    var self = this;

    Gridworks.postProcess(
        command, 
        params, 
        null,
        { columnStatsChanged: columnStatsChanged },
        {
            onDone: function(o) {
                self._cell = o.cell;
                self._render();
            }
        }
    );
};

DataTableCellUI.prototype._postProcessSeveralCells = function(command, params, columnStatsChanged) {
    Gridworks.postProcess(
        command, 
        params, 
        null,
        { cellsChanged: true, columnStatsChanged: columnStatsChanged }
    );
};

DataTableCellUI.prototype._previewCandidateTopic = function(id, elmt) {
    var url = "http://www.freebase.com/widget/topic" + id + '?mode=content&blocks=[{"block"%3A"image"}%2C{"block"%3A"full_info"}%2C{"block"%3A"article_props"}]';
    
    var fakeMenu = MenuSystem.createMenu();
    fakeMenu
        .width(700)
        .height(300)
        .css("background", "none")
        .css("border", "none");
    
    var iframe = $('<iframe></iframe>')
        .attr("width", "100%")
        .attr("height", "100%")
        .css("background", "none")
        .css("border", "none")
        .attr("src", url)
        .appendTo(fakeMenu);
    
    MenuSystem.showMenu(fakeMenu, function(){});
    MenuSystem.positionMenuLeftRight(fakeMenu, $(elmt));
};

DataTableCellUI.prototype._startEdit = function(elmt) {
    self = this;
    
    var menu = MenuSystem.createMenu().width("350px");
    menu.html(
        '<textarea class="data-table-cell-edit-editor" bind="textarea" />' +
        '<table class="data-table-cell-edit-layout">' +
            '<tr>' +
                '<td>' +
                    '<input type="radio" name="data-table-cell-edit-type" value="text" checked /> text ' +
                    '<input type="radio" name="data-table-cell-edit-type" value="number" /> number ' +
                    '<input type="radio" name="data-table-cell-edit-type" value="boolean" /> boolean' +
                    '<input type="radio" name="data-table-cell-edit-type" value="date" /> date' +
                '</td>' +
                '<td width="1%">' +
                    '<button bind="okButton">&nbsp;&nbsp;OK&nbsp;&nbsp;</button>' +
                '</td>' +
            '</tr>' +
        '</table>'
    );
    var elmts = DOM.bind(menu);
    
    MenuSystem.showMenu(menu, function(){});
    MenuSystem.positionMenuLeftRight(menu, $(this._td));
    
    var commit = function() {
        var type = $('input["data-table-cell-edit-type"]:checked')[0].value;
        var text = elmts.textarea[0].value;
        var value = text;
        
        if (type == "number") {
            value = parseFloat(text);
            if (isNaN(value)) {
                alert("Not a valid number.");
                return;
            }
        } else if (type == "boolean") {
            value = ("true" == text);
        } else if (type == "date") {
            value = Date.parse(text);
            if (value == null) {
                alert("Not a valid date.");
                return;
            }
            value = value.toString("yyyy-MM-ddTHH:mm:ssZ");
        }
        
        MenuSystem.dismissAll();
        
        var params = {
            row: self._rowIndex,
            cell: self._cellIndex,
            value: value,
            type: type
        };
        
        Gridworks.postProcess(
            "edit-one-cell", 
            params, 
            null,
            {},
            {
                onDone: function(o) {
                    self._cell = o.cell;
                    self._render();
                }
            }
        );
    };
    
    elmts.okButton.click(commit);
    elmts.textarea
        .text(this._cell == null || ("v" in this._cell && this._cell.v == null) ? "" : this._cell.v)
        .keydown(function(evt) {
            if (evt.keyCode == 13) {
                commit();
            } else if (evt.keyCode == 27) {
                MenuSystem.dismissAll();
            }
        })
        .select()
        .focus();
};