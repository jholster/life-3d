
/* Our in-house nano-framework */

var q = function(s) { return document.querySelector(s) };
var qa = function(s) { return Array.prototype.slice.call(document.querySelectorAll(s)) };

var getpath = function(path) {
	var obj = this;
	var components = path.split('.');
	components.forEach(function(c, i) {
		if (i == components.length - 1) return obj[c];
		else obj = obj[c];
	});
}

var callpath = function(path, params) {
	var obj = this;
	var components = path.split('.');
	components.forEach(function(c, i) {
		if (i == components.length - 1) return obj[c].apply(obj, params);
		else obj = obj[c];
	});
}


/* The Game */

var Grid = function(size, density, delay) {
	this.size = size || 16;
	this.density = density || .1;
	this.delay = delay || 1000;
};

Grid.prototype.init = function() {
    window.clearInterval(this.tick_timer);
    this.cells && this.cells.forEach(function(cell) { cell.unrender() });
    this.cells = [];
    this.tick_counter = 0;
    this.tick_timer = null;
    this.ticking = false;
    this.seed();
    this.build_neighbor_cache();
    this.render();
}

Grid.prototype.start_or_pause = function() {
    if (this.ticking) this.stop();
    else this.start();
}

Grid.prototype.start = function() {
    if (this.ticking) return;
    this.node.classList.add('ticking');
    this.tick();
    this.init_timer();
    this.ticking = true;
};

Grid.prototype.stop = function() {
    this.node.classList.remove('ticking');
    window.clearInterval(this.tick_timer);
    this.ticking = false;
}

Grid.prototype.set_delay = function(delay) {
	this.delay = delay;
	this.delay_changed = true;
	if (this.ticking) this.init_timer();
}

Grid.prototype.init_timer = function() {
    window.clearInterval(this.tick_timer);
    var that = this;
    this.tick_timer = window.setInterval(function() {
        that.tick();
    }, this.delay);
}

Grid.prototype.tick = function() {
    this.cells.forEach(function(cell) { cell.evolve(); }, this);
    this.cells.forEach(function(cell) { cell.tick(); }, this);
    this.tick_counter++;
    this.render();
    if (this.delay_changed) {
        this.delay_changed = false;
    }
}

Grid.prototype.seed = function() {
    for (var x = 0; x < this.size; x++) {
        for (var y = 0; y < this.size; y++) {
            var alive = Math.random() < this.density;
            this.cells.push(new Cell(x, y, alive));
        }
    }
}

Grid.prototype.build_neighbor_cache = function() {
    var ni_max = this.size * this.size - 1;
    this.cells.forEach(function(cell, i) {
        //var neighbors = cell.neighbors;
        var neighbors = [];
        var neighbor_indices = [i - 1,
                   i + 1,
                   i - 1 - this.size,
                   i - this.size,
                   i + 1 - this.size,
                   i - 1 + this.size,
                   i + this.size,
                   i + 1 + this.size];
       neighbor_indices.forEach(function(v) {
            //var ni = indeces[j];
            var ni = parseInt(v);
            if (ni < 0) ni += ni_max;
            else if (ni > ni_max) ni -= ni_max;
            if (! this.cells[ni]) {
                console.log(neighbor_indices);
                console.log('i: ' + i);
                console.log('v: ' + v);
                console.log('ni: ' + ni);
                console.log('size :' + this.size);
                console.log('ni_max: ' + ni_max);
                throw Error;
            }
            neighbors.push(this.cells[ni]);
        }, this);
        cell.neighbors = neighbors;
    }, this);
}

Grid.prototype.render = function() {
    if (! this.node) {
        this.node = document.createElement('div');
        this.node.className = 'grid';
        document.getElementById('viewport').appendChild(this.node);
    }
    q('#cyclecount').textContent = this.tick_counter;
    this.cells.forEach(function(cell) { cell.render(this.node) }, this);
    var cellsize = this.cells[0].node.offsetWidth + 2;
    this.node.style.width = (cellsize * this.size) + 'px';
    this.node.style.height = (cellsize * this.size) + 'px';
    this.node.parentNode.style.top = (window.innerHeight - (cellsize * this.size)) / 2 - 50 + 'px';
}

var Cell = function(x, y, alive) {
    this.x = x;
    this.y = y;
    this.alive = alive;
    this.die = false;
    this.neighbors = [];
    this.node = null;
}

Cell.prototype.alive_neighbors = function() {
    return this.neighbors.reduce(function(p, c) {
        return p + (c.alive ? 1 : 0);
    }, 0);
}

Cell.prototype.evolve = function() {
    var alive_neighbors = this.alive_neighbors();
    if (this.alive && (alive_neighbors == 2 || alive_neighbors == 3)) {
        this.die = false;
    } else if (! this.alive && alive_neighbors == 3) {
        this.die = false;
    } else {
        this.die = true;
    }
}

Cell.prototype.tick = function() {
    this.alive = ! this.die;
}

Cell.prototype.click = function() {
    this.alive = ! this.alive;
    this.render();
}

Cell.prototype.render = function(parent) {
    if (! this.node) {
        this.node = document.createElement('div');
        this.node.className = 'cell';
        var that = this;
        this.node.addEventListener('click', function() {
            that.click();
        }, false);
        parent.appendChild(this.node);
    }
    this.node.className = this.alive ? 'cell alive' : 'cell dead';
}

Cell.prototype.unrender = function() {
    this.node.parentNode.removeChild(this.node);
}


/* Glue everything together */

var grid = new Grid();

var button_keycodes = {};

qa('[data-action]').forEach(function(el) {
	var action = el.getAttribute('data-action');
	var keycode = el.getAttribute('data-keycode');
	if (keycode) button_keycodes[keycode] = el;
	if (el.nodeName.toLocaleLowerCase() == 'button') {
		el.addEventListener('click', function(event) {
			callpath(action);
		}, false);
	} else if (el.nodeName.toLowerCase() == 'input') {
		el.addEventListener('change', function(event) {
			callpath(action, [event.target.value]);
		}, false);
	}
});

q('#param-gridsize').addEventListener('change', function(event) {
	var el = event.target;
	var meter = el.parentNode.getElementsByTagName('div')[0];
	meter.textContent = el.value + '×' + el.value;
}, false);

q('#param-density').addEventListener('change', function(event) {
	var el = event.target;
	var meter = el.parentNode.getElementsByTagName('div')[0];
	meter.textContent = el.value + '%';
}, false);

q('#param-freq').addEventListener('change', function(event) {
	var el = event.target;
	var meter = el.parentNode.getElementsByTagName('div')[0];
	meter.textContent = el.value + ' Hz';
}, false);

window.addEventListener('keydown', function(event) {
	var button = button_keycodes[event.keyCode];
	if (button) {
		var action = button.getAttribute('data-action');
		button.classList.add('down');
		if (action) callpath(action);
	}
}, true);

window.addEventListener('keyup', function(event) {
	var button = button_keycodes[event.keyCode];
	if (button) {
		button.classList.remove('down');
	}
}, true);

var ui = {};

ui.control_gridsize = q('#param-gridsize');
ui.control_density = q('#param-density');
ui.control_freq = q('#param-freq');
ui.control_start = q('#btn-start');
ui.control_step = q('#btn-step');
ui.control_stop = q('#btn-stop');

ui.set_state = function(state) {
	if (state == 'stopped') {
		this.control_gridsize.disabled = false;
		this.control_density.disabled = false;
		this.control_freq.disabled = false;
		this.control_start.disabled = false;
		this.control_step.disabled = false;
		this.control_stop.disabled = true;
	} else if (state == 'running') {
		this.control_gridsize.disabled = true;
		this.control_density.disabled = true;
		this.control_freq.disabled = false;
		this.control_start.disabled = false;
		this.control_step.disabled = true;
		this.control_stop.disabled = false;
	} else if (state == 'paused') {
		this.control_step.disabled = false;
	}
	this.state = state;
	q('body').className = state;
}

ui.cb_gridsize = function(gridsize) {
	grid.size = parseInt(gridsize);
	grid.init();
}

ui.cb_density = function(density) {
	grid.density = density / 100;
	grid.init();
}

ui.cb_freq = function(freq) {
	grid.set_delay(1000 / freq);
}

ui.cb_start = function() {
	grid.start_or_pause();
	if (ui.state == 'running') ui.set_state('paused');
	else ui.set_state('running');
}

ui.cb_step = function() {
	grid.tick();
}

ui.cb_stop = function() {
	grid.init();
	ui.set_state('stopped');
}

ui.set_state('stopped');

grid.init();
