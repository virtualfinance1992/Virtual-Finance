import { jsPDF } from "jspdf"
var font = 'undefined';
var callAddFont = function () {
this.addFileToVFS('Roboto-normal.ttf', font);
this.addFont('Roboto-normal.ttf', 'Roboto', 'normal');
};
jsPDF.API.events.push(['addFonts', callAddFont])
