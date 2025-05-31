import { jsPDF } from "jspdf"
var font = 'undefined';
var callAddFont = function () {
this.addFileToVFS('Noto Sans-normal.ttf', font);
this.addFont('Noto Sans-normal.ttf', 'Noto Sans', 'normal');
};
jsPDF.API.events.push(['addFonts', callAddFont])
