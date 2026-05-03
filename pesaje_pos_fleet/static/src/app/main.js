/** @odoo-module */
import { registry } from "@web/core/registry";
import { PosApp } from "./PosApp";

registry.category("actions").add("pesaje_pos_fleet.pos_screen", PosApp);
