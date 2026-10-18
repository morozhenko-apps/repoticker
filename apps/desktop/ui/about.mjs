const invoke = command => window.__TAURI__?.core?.invoke(command) ??
  Promise.reject(new Error("Open About in RepoTicker."));
invoke("get_about_info").then(({version,author,website})=>{
  document.getElementById("version").textContent=version;
  document.getElementById("author").textContent=author;
  document.getElementById("website").title=website;
}).catch(error=>{document.getElementById("version").textContent=String(error);});
document.getElementById("website").addEventListener("click",()=>{
  void invoke("open_project_website").catch(error=>{
    document.getElementById("website").title=String(error);
  });
});
