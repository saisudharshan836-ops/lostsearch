import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore, collection, addDoc, onSnapshot, query, orderBy,
  doc, updateDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const reportsCollection = collection(db, "reports");
let reports = [];
let currentUser = null;
let unsubscribeReports = null;

const $ = id => document.getElementById(id);
function today(){ return new Date().toISOString().slice(0,10); }
function escapeHTML(value){
  return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function prettyDate(value){
  if(!value) return "";
  return new Date(value+"T00:00:00").toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"});
}
function notify(message){
  $("toastMessage").textContent = message;
  bootstrap.Toast.getOrCreateInstance($("appToast")).show();
}
function updateStats(){
  $("totalCount").textContent = reports.length;
  $("lostCount").textContent = reports.filter(x=>x.type==="lost"&&!x.resolved).length;
  $("foundCount").textContent = reports.filter(x=>x.type==="found"&&!x.resolved).length;
  $("resolvedCount").textContent = reports.filter(x=>x.resolved).length;
}
function render(){
  const q = $("searchInput").value.trim().toLowerCase();
  const type = $("typeFilter").value, cat = $("categoryFilter").value, sort = $("sortFilter").value;
  const filtered = reports.filter(x =>
    (type==="all"||x.type===type) && (cat==="all"||x.category===cat) &&
    [x.name,x.location,x.description,x.category,x.reporter].join(" ").toLowerCase().includes(q)
  );
  filtered.sort((a,b)=>sort==="newest"?(b.created||0)-(a.created||0):(a.created||0)-(b.created||0));
  $("resultsText").textContent = `Showing ${filtered.length} of ${reports.length} report${reports.length===1?"":"s"}`;
  $("itemsGrid").innerHTML = filtered.map(item=>`
    <div class="col-md-6 col-xl-4"><article class="item-card">
      <div class="item-card-top">
        <span class="type-badge ${item.type==="lost"?"type-lost":"type-found"}">${item.type==="lost"?"<i class='bi bi-search me-1'></i> Lost item":"<i class='bi bi-hand-thumbs-up me-1'></i> Found item"}</span>
        <span class="status-badge">${item.resolved?"<i class='bi bi-check-circle-fill text-success'></i> Reunited":"<i class='bi bi-circle-fill text-warning' style='font-size:6px'></i> Active"}</span>
      </div>
      <div class="item-card-body">
        <div class="item-category">${escapeHTML(item.category)}</div>
        <h5>${escapeHTML(item.name)}</h5>
        <p class="item-description">${escapeHTML(item.description||"No additional description provided.")}</p>
        <div class="item-meta"><i class="bi bi-geo-alt-fill"></i>${escapeHTML(item.location)}</div>
        <div class="item-meta"><i class="bi bi-calendar3"></i>${prettyDate(item.date)}</div>
        <div class="item-footer">
          <span class="reporter">Posted by <strong>${escapeHTML(item.reporter)}</strong></span>
          <div class="item-actions">
            <a class="small-action" href="mailto:${encodeURIComponent(item.contact)}?subject=${encodeURIComponent("CampusConnect: "+item.name)}" title="Contact reporter"><i class="bi bi-envelope"></i></a>
            ${item.resolved?"":`<button class="small-action resolve" data-action="resolve" data-id="${escapeHTML(item.id)}">Reunited</button>`}
            <button class="small-action" data-action="delete" data-id="${escapeHTML(item.id)}" title="Delete report"><i class="bi bi-trash3"></i></button>
          </div>
        </div>
      </div>
    </article></div>`).join("");
  $("emptyState").classList.toggle("d-none",filtered.length!==0);
  updateStats();
}
async function startReportsListener(){
  if(unsubscribeReports) unsubscribeReports();
  const reportsQuery = query(reportsCollection, orderBy("createdAt","desc"));
  unsubscribeReports = onSnapshot(reportsQuery, snapshot=>{
    reports = snapshot.docs.map(d=>({id:d.id,...d.data(),created:d.data().createdAt?.toMillis?.() || 0}));
    render();
    $("connectionStatus")?.remove();
  }, error=>{
    console.error("Firestore listener error:",error);
    notify("Could not load reports. Check Firestore rules and setup.");
  });
}
async function requireUser(){
  try {
    const credential = await signInAnonymously(auth);
    currentUser = credential.user;
    await startReportsListener();
  } catch(error) {
    console.error("Firebase sign-in error:",error);
    notify("Firebase sign-in failed. Enable Anonymous sign-in in Firebase Authentication.");
  }
}
async function resolveItem(id){
  try {
    await updateDoc(doc(db,"reports",id),{resolved:true,updatedAt:serverTimestamp()});
    notify("Marked as reunited. Great work!");
  } catch(error){console.error(error);notify("Could not update this report. Check Firestore rules.");}
}
async function deleteItem(id){
  if(!confirm("Delete this report permanently?")) return;
  try {
    await deleteDoc(doc(db,"reports",id));
    notify("Report deleted.");
  } catch(error){console.error(error);notify("Could not delete this report. Check Firestore rules.");}
}
$("itemsGrid").addEventListener("click",e=>{
  const button=e.target.closest("button[data-action]");
  if(!button) return;
  const id=button.dataset.id;
  if(button.dataset.action==="resolve") resolveItem(id);
  if(button.dataset.action==="delete") deleteItem(id);
});
["searchInput","typeFilter","categoryFilter","sortFilter"].forEach(id =>
  $(id).addEventListener(id==="searchInput"?"input":"change",render)
);
$("clearFilters").addEventListener("click",()=>{
  $("searchInput").value=""; $("typeFilter").value="all";
  $("categoryFilter").value="all"; $("sortFilter").value="newest"; render();
});
$("itemDate").value=today();
$("itemDate").max=today();

$("reportForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const form=e.currentTarget;
  if(!form.reportValidity()) return;
  if(!currentUser){notify("Connecting to Firebase. Please try again.");return;}
  const type=new FormData(form).get("type");
  const report={
    type,
    name:$("itemName").value.trim(),
    category:$("itemCategory").value,
    location:$("itemLocation").value.trim(),
    date:$("itemDate").value,
    description:$("itemDescription").value.trim(),
    reporter:$("reporterName").value.trim(),
    contact:$("reporterContact").value.trim(),
    resolved:false,
    createdAt:serverTimestamp(),
    ownerUid:currentUser.uid
  };
  try{
    await addDoc(reportsCollection,report);
    form.reset(); $("itemDate").value=today();
    bootstrap.Modal.getOrCreateInstance($("reportModal")).hide();
    notify("Your report has been published to Firebase.");
  }catch(error){
    console.error("Add report error:",error);
    notify("Could not publish. Check Firestore rules and setup.");
  }
});

render();
requireUser();
