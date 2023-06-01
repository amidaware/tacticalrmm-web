<!--
Copyright (c) 2023-present Amidaware Inc.
This file is subject to the EE License Agreement.
For details, see: https://license.tacticalrmm.com/ee
-->

<template>
  <q-bar>
    <q-btn-dropdown
      label="Formatting"
      flat
      dense
      auto-close
      :ripple="false"
      @hide="_editor.focus()"
    >
      <q-list dense>
        <q-item clickable @click="insertHeader('#')">
          <q-item-section>
            <q-item-label>Heading 1</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable @click="insertHeader('##')">
          <q-item-section>
            <q-item-label>Heading 2</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable @click="insertHeader('###')">
          <q-item-section>
            <q-item-label>Heading 3</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable @click="insertHeader('####')">
          <q-item-section>
            <q-item-label>Heading 4</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable @click="insertHeader('#####')">
          <q-item-section>
            <q-item-label>Heading 5</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable @click="insertHeader('######')">
          <q-item-section>
            <q-item-label>Heading 6</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-btn-dropdown>

    <q-btn-dropdown
      label="Section"
      flat
      dense
      auto-close
      :ripple="false"
      @hide="_editor.focus()"
    >
      <q-list dense>
        <q-item clickable @click="insertSection('section')">
          <q-item-section>
            <q-item-label>Section</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable @click="insertSection('chapter')">
          <q-item-section>
            <q-item-label>Chapter</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable @click="insertSection('header')">
          <q-item-section>
            <q-item-label>Header</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable @click="insertSection('footer')">
          <q-item-section>
            <q-item-label>Footer</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable @click="insertSection('nav')">
          <q-item-section>
            <q-item-label>Nav</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable @click="insertSection('div')">
          <q-item-section>
            <q-item-label>Div</q-item-label>
          </q-item-section>
        </q-item>
        <q-item clickable @click="insertSection('article')">
          <q-item-section>
            <q-item-label>Article</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-btn-dropdown>

    <q-btn flat dense :ripple="false" icon="format_bold" @click="insertBold">
      <q-tooltip :delay="500">Bold</q-tooltip>
    </q-btn>
    <q-btn
      flat
      dense
      :ripple="false"
      icon="format_italic"
      @click="insertItalic"
    >
      <q-tooltip :delay="500">Italic</q-tooltip>
    </q-btn>
    <q-separator vertical inset />
    <q-btn
      flat
      dense
      :ripple="false"
      icon="format_list_numbered"
      @click="insertNumberedList"
    >
      <q-tooltip :delay="500">Numbered List</q-tooltip>
    </q-btn>
    <q-btn
      flat
      dense
      :ripple="false"
      icon="format_list_bulleted"
      @click="insertBulletList"
    >
      <q-tooltip :delay="500">Bullet List</q-tooltip>
    </q-btn>
    <q-separator vertical inset />
    <q-btn
      flat
      dense
      :ripple="false"
      icon="format_quote"
      @click="insertBlockQuote"
    >
      <q-tooltip :delay="500">Block Quote</q-tooltip>
    </q-btn>
    <q-separator vertical inset />
    <q-btn flat dense :ripple="false" icon="undo" @click="undo">
      <q-tooltip :delay="500">Undo</q-tooltip>
    </q-btn>
    <q-btn flat dense :ripple="false" icon="redo" @click="redo">
      <q-tooltip :delay="500">Redo</q-tooltip>
    </q-btn>
    <q-separator vertical inset />
    <q-btn flat dense :ripple="false" icon="code" @click="insertCodeBlock">
      <q-tooltip :delay="500">Code Block</q-tooltip>
    </q-btn>
    <q-btn flat dense :ripple="false" icon="link">
      <q-tooltip :delay="500">Link</q-tooltip>
      <q-menu>
        <div class="no-wrap q-pa-md">
          <div class="text-subtitle1">Create Link</div>
          <q-input v-model="linkText" label="Text" type="text" />

          <q-input v-model="linkUrl" label="Url" type="text" />

          <q-btn
            v-close-popup
            color="primary"
            label="Insert Link"
            class="full-width q-mt-sm"
            flat
            dense
            @click="insertLink"
          />
        </div>
      </q-menu>
    </q-btn>
    <q-btn flat dense :ripple="false" icon="image" @click="insertImage">
      <q-tooltip :delay="500">Image</q-tooltip>
    </q-btn>
    <q-btn flat dense :ripple="false" icon="horizontal_rule" @click="insertHr">
      <q-tooltip :delay="500">Horizontal Rule</q-tooltip>
    </q-btn>
    <q-separator vertical inset />

    <!-- Jinja Block -->
    <q-btn
      flat
      dense
      :ripple="false"
      label="{% %}"
      no-caps
      @click="insertJinjaBlock('block [name]', 'endblock')"
    >
      <q-tooltip :delay="500">Jinja {% %} block</q-tooltip>
    </q-btn>

    <q-btn
      no-caps
      flat
      dense
      :ripple="false"
      label="{{ }}"
      @click="insertJinjaData()"
    >
      <q-tooltip :delay="500">Jinja template data</q-tooltip>
    </q-btn>

    <q-btn
      flat
      dense
      :ripple="false"
      label="{% for "
      no-caps
      @click="insertJinjaBlock('for item in items', 'endfor')"
    >
      <q-tooltip :delay="500">Jinja for loop</q-tooltip>
    </q-btn>

    <q-btn
      flat
      dense
      :ripple="false"
      label="{% if"
      no-caps
      @click="insertJinjaBlock('if [condition]', 'endif')"
    >
      <q-tooltip :delay="500">Jinja if condition</q-tooltip>
    </q-btn>

    <q-separator vertical inset />

    <q-btn
      flat
      dense
      :ripple="false"
      icon="mdi-database-arrow-down"
      @click="insertDataQuery"
    >
      <q-tooltip :delay="500">Insert Data Query</q-tooltip>
    </q-btn>

    <q-btn
      flat
      dense
      :ripple="false"
      icon="mdi-database-plus-outline"
      @click="openQueryAddDialog"
    >
      <q-tooltip :delay="500">Add Data Query</q-tooltip>
    </q-btn>

    <q-btn
      flat
      dense
      :ripple="false"
      icon="mdi-table-large-plus"
      @click="insertTable"
    >
      <q-tooltip :delay="500">Table</q-tooltip>
    </q-btn>

    <q-btn flat dense :ripple="false" icon="add_chart" @click="openChartDialog">
      <q-tooltip :delay="500">Add chart</q-tooltip>
    </q-btn>

    <slot name="buttons"></slot>
  </q-bar>
</template>

<script setup lang="ts">
// composition imports
import { ref, toRaw, onMounted } from "vue";
import { useQuasar } from "quasar";
import * as monaco from "monaco-editor";
import { parse, stringify } from "yaml";

// ui import
import ReportDataQueryForm from "./ReportDataQueryForm.vue";
import DataQuerySelect from "./DataQuerySelect.vue";
import ReportAssetSelect from "./ReportAssetSelect.vue";
import ReportChartSelect from "./ReportChartSelect.vue";

// utils
import { convertCamelCase } from "@/utils/format";

// types
import { ReportTemplateType } from "../types/reporting";

// props
const props = defineProps<{
  editor: monaco.editor.IStandaloneCodeEditor;
  variablesEditor: monaco.editor.IStandaloneCodeEditor;
  templateType: ReportTemplateType;
}>();

const $q = useQuasar();

const _editor = toRaw(props.editor);
const isMultiLineSelection = ref(false);

// link insert refs
const linkUrl = ref("");
const linkText = ref("");

onMounted(() => {
  // disable certain toolbar options if a multiline text selection is made
  _editor.onDidChangeCursorSelection((evt) => {
    isMultiLineSelection.value = monaco.Selection.spansMultipleLines(
      evt.selection
    );
  });
});

// toolbar actions
function insertHeader(header: string) {
  if (props.templateType === "markdown") insertPrefix("#", header.length);
  else insertWrap(`<h${header.length}>`, `</h${header.length}>`);
  _editor.focus();
}

function insertBold() {
  if (props.templateType === "markdown") insertWrap("**", "**");
  else insertWrap("<b>", "</b>");
  _editor.focus();
}

function insertItalic() {
  if (props.templateType === "markdown") insertWrap("*", "*");
  else insertWrap("<i>", "</i>");
  _editor.focus();
}

function insertNumberedList() {
  if (props.templateType === "markdown") insertPrefix("1.");
  else insert("<ol>\n\t<li></li>\n\t<li></li>\n</ol>", true);
  _editor.focus();
}

function insertBulletList() {
  if (props.templateType === "markdown") insertPrefix("*");
  else insert("<ul>\n\t<li></li>\n\t<li></li>\n</ul>", true);
  _editor.focus();
}

function insertBlockQuote() {
  if (props.templateType === "markdown") insertPrefix(">");
  else insertWrap("<blockquote>", "</blockquote>", true);
  _editor.focus();
}

function insertCodeBlock() {
  if (props.templateType === "markdown") {
    if (isMultiLineSelection.value) {
      insertWrap("```\n", "\n```", true);
    } else {
      insertWrap("`", "`");
    }
  } else {
    insertWrap("<code>", "</code>");
  }
  _editor.focus();
}

function insertDataQuery() {
  $q.dialog({
    component: DataQuerySelect,
  }).onOk((queryName: string) => {
    let variablesJson = parse(props.variablesEditor.getValue()) || {};

    if (!("data_sources" in variablesJson)) {
      variablesJson["data_sources"] = {};
    }
    variablesJson["data_sources"][convertCamelCase(queryName)] = queryName;
    props.variablesEditor?.setValue(stringify(variablesJson));
  });
}

function openChartDialog() {
  $q.dialog({
    component: ReportChartSelect,
  }).onOk((data) => {
    let variablesJson = parse(props.variablesEditor.getValue()) || {};
    const optionsJson = parse(data.options);

    if (!("charts" in variablesJson)) {
      variablesJson["charts"] = {};
    }

    variablesJson["charts"][convertCamelCase(data.name)] = {
      chartType: data.chartType,
      outputType: data.outputType,
      options: optionsJson,
    };

    props.variablesEditor?.setValue(stringify(variablesJson));
  });
}

function openQueryAddDialog() {
  $q.dialog({
    component: ReportDataQueryForm,
  }).onOk((queryName: string) => {
    let variablesJson = parse(props.variablesEditor.getValue()) || {};

    if (!("data_sources" in variablesJson)) {
      variablesJson["data_sources"] = {};
    }
    variablesJson["data_sources"][convertCamelCase(queryName)] = queryName;
    props.variablesEditor?.setValue(stringify(variablesJson));
  });
}
function insertLink() {
  if (props.templateType === "markdown")
    insert(`[${linkText.value}](${linkUrl.value})`);
  else insert(`<a href="${linkUrl.value}">${linkText.value}</a>`);
  _editor.focus();
}

function insertImage() {
  $q.dialog({
    component: ReportAssetSelect,
    componentProps: {
      templateType: props.templateType,
    },
  })
    .onOk((text) => {
      insert(text);
    })
    .onDismiss(() => _editor.focus());
}

function redo() {
  _editor.trigger("toolbar", "redo", null);
  _editor.focus();
}

function undo() {
  _editor.trigger("toolbar", "undo", null);
  _editor.focus();
}

function insertHr() {
  if (props.templateType === "markdown") insert("---", true);
  else insert("<hr />", true);
  _editor.focus();
}

function insertTable() {
  const table = `<table>
    <thead>
      <tr>
        <th>Column1 Name</th>
        <th>Column2 Name</th>
        <th>Column3 Name</th>
      </tr>
    </thead>
    <tbody>
      {% for agents in datasources.agentsQuery %}
      <tr>
        <td></td>
        <td></td>
        <td></td>
      </tr>
      {% endfor %}
    </tbody>
  </table>`;
  insert(table, true);
  _editor.focus();
}

type Section =
  | "article"
  | "div"
  | "section"
  | "header"
  | "footer"
  | "nav"
  | "chapter";

function insertSection(section: Section) {
  if (props.templateType === "markdown") {
    const tag = section.slice(0, 1).toUpperCase();
    insertWrap(`~~${tag}~~\n`, `\n~~/${tag}~~`, true);
  } else {
    insertWrap(`<${section}>`, `</${section}>`, true);
  }
  _editor.focus();
}

function insertJinjaBlock(open: string, end: string) {
  insertWrap(`{% ${open} %}`, `{% ${end} %}`, true);
  _editor.focus();
}

function insertJinjaData() {
  insertWrap("{{", "}}");
  _editor.focus();
}

// inserts text on a new line below the cursor position
function insert(text: string, moveToNewLine = false) {
  const model = _editor.getModel();
  const selections = _editor.getSelections();
  if (!model || !selections) return;

  let operations = [] as monaco.editor.IIdentifiedSingleEditOperation[];
  for (let selection of selections) {
    const end = selection.getEndPosition();

    let editSelection = moveToNewLine
      ? monaco.Selection.fromPositions({
          lineNumber: end.lineNumber,
          column: model.getLineMaxColumn(end.lineNumber),
        })
      : selection;

    const editText = moveToNewLine ? `\n${text}\n` : text;
    operations.push({
      text: editText,
      range: editSelection,
      forceMoveMarkers: true,
    });
  }

  model.pushEditOperations(selections, operations, null);
}

// inserts a prefix before selected text
function insertPrefix(prefix: string, prefixCount = 1) {
  const model = _editor.getModel();
  const selections = _editor.getSelections();
  if (!model || !selections) return;

  let operations = [] as monaco.editor.IIdentifiedSingleEditOperation[];
  let newSelections = [] as monaco.Selection[];
  for (let selection of selections) {
    const start = selection.getStartPosition();
    const end = selection.getEndPosition();

    let editSelection = monaco.Selection.fromPositions(
      { lineNumber: start.lineNumber, column: 0 },
      {
        lineNumber: end.lineNumber,
        column: model.getLineMaxColumn(end.lineNumber),
      }
    );
    let replacementText = [] as string[];

    newSelections.push(editSelection);

    // loop over line numbers
    for (let i = start.lineNumber; i <= end.lineNumber; i++) {
      let text = model?.getLineContent(i).trimStart();

      // prefix and prefix character amount match so should toggle off prefix in editor
      const re_toggle = new RegExp(`^${prefix}{${prefixCount}}\\s`);
      const re_replace = new RegExp(`^${prefix}+\\s`);

      if (text.match(re_toggle)) {
        // remove prefix since it is present already (toggled off)
        text = text.replace(prefix.repeat(prefixCount), "").trimStart();
      } else {
        // add prefix
        text = `${prefix.repeat(prefixCount)} ${text
          ?.replace(re_replace, "")
          .trimStart()}`;
      }

      replacementText.push(text);
    }

    operations.push({
      text: replacementText.join("\n"),
      range: editSelection,
      forceMoveMarkers: true,
    });
  }

  model.pushEditOperations(
    selections,
    operations,
    (/* operations */) => newSelections
  );
}

// wraps selected text beginning with a prefix and ending with a suffix
function insertWrap(prefix: string, suffix: string, includeWholeLine = false) {
  const model = _editor.getModel();
  const selections = _editor.getSelections();
  if (!model || !selections) return;

  let operations = [] as monaco.editor.IIdentifiedSingleEditOperation[];
  for (let selection of selections) {
    const start = selection.getStartPosition();
    const end = selection.getEndPosition();

    let editSelection = includeWholeLine
      ? monaco.Selection.fromPositions(
          { lineNumber: start.lineNumber, column: 0 },
          {
            lineNumber: end.lineNumber,
            column: model.getLineMaxColumn(end.lineNumber),
          }
        )
      : selection;

    const text = `${prefix}${model.getValueInRange(editSelection)}${suffix}`;

    operations.push({
      text: text,
      range: editSelection,
      forceMoveMarkers: true,
    });
  }

  model.pushEditOperations(selections, operations, (operations) => {
    return operations.map((operation) =>
      monaco.Selection.fromRange(operation.range, monaco.SelectionDirection.LTR)
    );
  });
}
</script>
