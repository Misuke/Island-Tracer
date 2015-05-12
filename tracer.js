var canvas = $('canvas')[0];
var ctx;
var TAILLE_CASE = 10;
var currentX    = 100;
var currentY    = 9;
var manual      = document.getElementById('manual').checked;
var nextStep    = true;
var maps;
var indice = 0;
var jsonData;
var pref;

window.requestAnimFrame = function() {
    return (
        window.requestAnimationFrame       ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame    ||
        window.oRequestAnimationFrame      ||
        window.msRequestAnimationFrame     ||
        function(callback) {
            window.setTimeout(callback, 1000/60);
        }
    );
}();

$('#manual').click(onClickManual);
function onClickManual() {
    manual = document.getElementById('manual').checked;
    if (manual) {
        document.addEventListener("keydown", eventNextStep);
    } else {
        document.removeEventListener("keydown", eventNextStep);
    }
}

$('#showMap').click(displayMap);
function displayMap() {
    if ($('#showMap')[0].checked) {
        $.each(maps, function(index, el) {
            if (el.name == $('#weekSelector option:selected')[0].value) {
                canvas.style = "background: url('res/"+ el.map +"');";
            }
        });    
    } else {
        canvas.style = "background: none;";
    }
}

$('#weekSelector').change(function(event) {
    var value = $('#weekSelector option:selected')[0].value;
    $.each(maps, function(index, el) {
        if (el.name == value) {
            $('#startingTileX').val(el.startingTileX);
            $('#startingTileY').val(el.startingTileY);
            return;
        }
    });
});

function eventNextStep(e) {
    if (e.keyCode == 32) { // Spacebar
        e.preventDefault();
        nextStep = true;
        drawNext();
    }
}

function initPref() {
    $.getJSON('res/config.json', function(json, textStatus) {
        pref = json;
        
        var html = "";
        for (var prop in pref) {
            html += prop+" : ";
            html += "<input id='color"+prop+"' type='text' value='"+pref[prop].color+"' placeholder='Couleur "+prop+"' />";
            html += "<select id='drawType"+prop+"'>";
            if (pref[prop].drawType == 'fill') {
                html += "<option value='fill' selected='selected'>Colorier</option>";
                html += "<option value='stroke'>Bordure</option>";
            } else if (pref[prop].drawType == 'stroke') {
                html += "<option value='fill'>Colorier</option>";
                html += "<option value='stroke' selected='selected'>Bordure</option>";
            }
            html += "</select>";
        }

        $('#colors').html(html);
    });
}

function getPreferences(action) {
    if (typeof(pref) === 'undefined') {
        initPref();
    }

    return {
        type: $('#drawType'+action+' option:selected')[0].value,
        color: $('#color'+action)[0].value
    };
}

function changeColor(ctx, action) {
    var pref = getPreferences(action);
    if (pref.type == "stroke") {
        ctx.strokeStyle = pref.color;
    } else if (pref.type == "fill") {
        ctx.fillStyle = pref.color;
    }

    return pref.type;
}

function nextCoordinate(direction, x, y) {
    switch(direction) {
        case 'N':
            --y;
            break;
        case 'W':
            --x;
            break;
        case 'S':
            ++y;
            break;
        case 'E':
            ++x;
            break;
    };

    return {
        x: x,
        y: y
    };
}

function dimension(direction, range) {
    var width = height = 1;
    switch(direction) {
        case 'N':
            height -= range;
            break;
        case 'W':
            width -= range;
            break;
        case 'S':
            height += range-1;
            break;
        case 'E':
            width += range-1;
            break;
    };

    return {
        width: width,
        height: height
    }
}

function tileToDraw(action, parameters) {
    var tileX = currentX;
    var tileY = currentY;

    switch(action) {
        case 'land':
        case 'explore':
        case 'exploit':
                break;

        case 'move_to':
            var coord = nextCoordinate(parameters.direction, tileX, tileY);
            currentX = tileX = coord.x;
            currentY = tileY = coord.y;
        break;

        case 'scout':
            var coord = nextCoordinate(parameters.direction, tileX, tileY);
            tileX = coord.x;
            tileY = coord.y;
            break;

        case 'glimpse':
            var dim = dimension(parameters.direction, parameters.range);
            return {
                x: tileX,
                y: tileY,
                width: dim.width,
                height: dim.height
            };
    };

    return {
        x: tileX,
        y: tileY
    };
}

function draw(ctx, action, x, y, width, height) {
    var width    = typeof(width)==='undefined' ? 1 : width;
    var height   = typeof(height)==='undefined' ? 1 : height;
    var drawType = changeColor(ctx, action);
    if (drawType == "stroke") {
        ctx.strokeRect(x*TAILLE_CASE, y*TAILLE_CASE, width*TAILLE_CASE , height*TAILLE_CASE);
    } else {
        ctx.fillRect(x*TAILLE_CASE, y*TAILLE_CASE, width*TAILLE_CASE , height*TAILLE_CASE);
    }
}

function drawNext() {
    var el = jsonData[indice++];
    if (el.part == "Explorer") {
        var tile = tileToDraw(el.data.action, el.data.parameters);
        draw(ctx, el.data.action, tile.x, tile.y, tile.width, tile.height);
        $('#logs ol').append('<li>'+ actionInfos(el.data.action, el.data.parameters) +'</li>');
        document.getElementById('logs').scrollTop = document.getElementById('logs').scrollHeight;
    }
}

function actionInfos(action, parameters) {
    var msg = action;
    switch(action) {
        case 'land':
        case 'explore':
        case 'exploit':
                break;

        case 'move_to':
        case 'scout':
            msg += " " + parameters.direction;
        break;

        case 'glimpse':
            var str = " "+ parameters.direction +" "+ parameters.range;
            msg += str;
            break;
    };

    return msg;
}

function animate() {
    var speed = document.getElementById('speed').value;
    if (manual) {
        if (nextStep) {
            drawNext();
            nextStep = false;
        }
    } else {
        drawNext();
    }
    setTimeout(function() {
        requestAnimFrame(animate)
    }, speed);
}

function initContext() {
    ctx           = canvas.getContext('2d');
    ctx.lineWidth = 1;
    ctx.lineJoin  = "round";
}

function initDashboard() {
    $.getJSON('res/maps.json', function(json, textStatus) {
        var options = "";
        maps = json;
        $.each(maps, function(index, el) {
            options += "<option value='"+ el.name +"'>"+ el.name +"</option>";
        });
        $('#startingTileX').val(maps[0].startingTileX);
        $('#startingTileY').val(maps[0].startingTileY);

        $('#weekSelector').html(options);
    });
}

$(document).ready(function() {
    initDashboard();
    initContext();
    initPref();
    onClickManual();

    $('#start').click(function(event) {
        indice = 0;
        $('#logs ol').html("");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        currentX = $('#startingTileX')[0].value;
        currentY = $('#startingTileY')[0].value;
        draw(ctx, 'land', currentX, currentY);
        displayMap();
        jsonData = $.parseJSON($('#json')[0].value);
        if (document.getElementById('animation').checked) {
            animate();
        } else {
            for (var i = jsonData.length - 1; i >= 0; i--) {
                drawNext();
            };
        }
    });
});
