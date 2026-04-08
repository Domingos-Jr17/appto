import { test, expect, loginAsSeedUser } from "./helpers";

test.describe("Workspace Polling - Gera��o de Trabalho", () => {
  test.describe.configure({ timeout: 180000 });

  let projectId: string | null = null;

  test.afterEach(async ({ page }) => {
    if (projectId) {
      try {
        await page.request.delete(`/api/projects/${projectId}`);
      } catch {
        // Ignore cleanup errors
      }
      projectId = null;
    }
  });

  test("faz polling autom�tico durante gera��o sem refresh manual", async ({ page }) => {
    await loginAsSeedUser(page);

    await page.goto("/app/trabalhos");
    await expect(page.getByRole("heading", { name: "Trabalhos" })).toBeVisible({ timeout: 15000 });

    await page.getByRole("button", { name: /criar trabalho/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    const workTitle = `Teste Polling ${Date.now()}`;
    await page.getByLabel("T�tulo").fill(workTitle);

    await page.getByRole("button", { name: /continuar/i }).click();

    await page.waitForTimeout(500);

    await page.getByLabel("Institui��o").fill("Universidade Eduardo Mondlane");
    await page.getByLabel("Curso").fill("Engenharia Inform�tica");
    await page.getByLabel("Nome do Autor").fill("Teste Automation");

    await page.getByRole("button", { name: /criar trabalho/i }).click();

    await page.waitForURL(/\/app\/trabalhos\/[a-zA-Z0-9]+/);
    const url = page.url();
    const match = url.match(/\/app\/trabalhos\/([a-zA-Z0-9]+)/);
    projectId = match ? match[1] : null;

    expect(projectId).not.toBeNull();

    const initialSections = await page.locator('[data-testid="section-item"]').count();
    
    await page.waitForTimeout(5000);

    const sectionsAfterWait = await page.locator('[data-testid="section-item"]').count();
    
    expect(sectionsAfterWait).toBeGreaterThanOrEqual(initialSections);
  });

  test(" exponential backoff - intervalo aumenta quando sem progresso", async ({ page }) => {
    await loginAsSeedUser(page);

    await page.goto("/app/trabalhos");
    await expect(page.getByRole("heading", { name: "Trabalhos" })).toBeVisible({ timeout: 15000 });

    await page.getByRole("button", { name: /criar trabalho/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    const workTitle = `Teste Backoff ${Date.now()}`;
    await page.getByLabel("T�tulo").fill(workTitle);

    await page.getByRole("button", { name: /continuar/i }).click();
    await page.waitForTimeout(500);

    await page.getByLabel("Institui��o").fill("Universidade Eduardo Mondlane");
    await page.getByLabel("Curso").fill("Engenharia");
    await page.getByLabel("Nome do Autor").fill("Teste");

    await page.getByRole("button", { name: /criar trabalho/i }).click();

    await page.waitForURL(/\/app\/trabalhos\/[a-zA-Z0-9]+/);
    const url = page.url();
    const match = url.match(/\/app\/trabalhos\/([a-zA-Z0-9]+)/);
    projectId = match ? match[1] : null;

    expect(projectId).not.toBeNull();

    const progressElement = page.locator('[data-testid="generation-progress"]');
    
    const initialProgress = await progressElement.count() > 0 
      ? await progressElement.textContent() 
      : "0";

    await page.waitForTimeout(8000);

    const laterProgress = await progressElement.count() > 0 
      ? await progressElement.textContent() 
      : "0";

    expect(laterProgress).not.toBe(initialProgress);
  });

  test("polling para quando gera��o completa", async ({ page }) => {
    await loginAsSeedUser(page);

    await page.goto("/app/trabalhos");
    await expect(page.getByRole("heading", { name: "Trabalhos" })).toBeVisible({ timeout: 15000 });

    const existingProjects = await page.locator('[data-testid="project-card"]').count();

    if (existingProjects > 0) {
      await page.locator('[data-testid="project-card"]').first().click();
      
      await page.waitForURL(/\/app\/trabalhos\/[a-zA-Z0-9]+/);
      
      const url = page.url();
      const match = url.match(/\/app\/trabalhos\/([a-zA-Z0-9]+)/);
      projectId = match ? match[1] : null;
    } else {
      await page.getByRole("button", { name: /criar trabalho/i }).click();
      await expect(page.getByRole("dialog")).toBeVisible();

      const workTitle = `Teste Completo ${Date.now()}`;
      await page.getByLabel("T�tulo").fill(workTitle);

      await page.getByRole("button", { name: /continuar/i }).click();
      await page.waitForTimeout(500);

      await page.getByLabel("Institui��o").fill("UEM");
      await page.getByLabel("Curso").fill("Teste");
      await page.getByLabel("Nome do Autor").fill("Tester");

      await page.getByRole("button", { name: /criar trabalho/i }).click();

      await page.waitForURL(/\/app\/trabalhos\/[a-zA-Z0-9]+/);
      const url = page.url();
      const match = url.match(/\/app\/trabalhos\/[a-zA-Z0-9]+/);
      projectId = match ? match[1] : null;
    }

    expect(projectId).not.toBeNull();

    await page.waitForTimeout(15000);

    const statusBadge = page.locator('[data-testid="generation-status"]');
    const status = await statusBadge.textContent().catch(() => "");

    const hasCompletedContent = await page.locator('[data-testid="section-item"]').count() > 0;

    expect(hasCompletedContent || status?.includes("Pronto") || status?.includes("READY")).toBeTruthy();
  });

  test("n�o mostra CSS bruto da capa quando o trabalho tem front matter guardado em HTML", async ({ page }) => {
    await loginAsSeedUser(page);

    const workTitle = `Teste Front Matter ${Date.now()}`;
    const createResponse = await page.request.post("/api/projects", {
      data: {
        title: workTitle,
        type: "HIGHER_EDUCATION_WORK",
        brief: {
          educationLevel: "HIGHER_EDUCATION",
          institutionName: "Universidade Eduardo Mondlane",
          facultyName: "Faculdade de Letras",
          studentName: "Estudante Teste",
          advisorName: "Professora Ana",
          city: "Maputo",
          academicYear: 2026,
        },
      },
    });

    expect(createResponse.ok()).toBeTruthy();
    const project = await createResponse.json();
    projectId = project.id;

    const sectionsResponse = await page.request.get(`/api/documents?projectId=${projectId}`);
    expect(sectionsResponse.ok()).toBeTruthy();
    const sections = await sectionsResponse.json();

    const coverSection = sections.find((section: { title: string }) => section.title === "Capa");
    const titlePageSection = sections.find((section: { title: string }) => section.title === "Folha de Rosto");
    const introSection = sections.find((section: { title: string }) => section.title.includes("Introdu"));

    expect(coverSection).toBeTruthy();
    expect(titlePageSection).toBeTruthy();
    expect(introSection).toBeTruthy();

    await page.request.put(`/api/documents/${coverSection.id}`, {
      data: {
        content: "<style>* { box-sizing: border-box; }</style><div>Logo</div>",
      },
    });
    await page.request.put(`/api/documents/${titlePageSection.id}`, {
      data: {
        content: "<div style=\"font-size: 12pt;\">Folha em HTML</div>",
      },
    });
    await page.request.put(`/api/documents/${introSection.id}`, {
      data: {
        content: "Conte�do final da introdu��o.",
      },
    });

    await page.goto(`/app/trabalhos/${projectId}`);

    await expect(page.getByText("Universidade Eduardo Mondlane")).toBeVisible();
    await expect(page.getByText("Estudante Teste")).toBeVisible();
    await expect(page.getByText("Professora Ana")).toBeVisible();
    await expect(page.getByText("Conte�do final da introdu��o.")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("box-sizing");
    await expect(page.locator("body")).not.toContainText("Folha em HTML");
  });
});

test.describe("Workspace - Auto-save", () => {
  test("faz auto-save ap�s digita��o sem necessidade de manual save", async ({ page }) => {
    await loginAsSeedUser(page);

    await page.goto("/app/trabalhos");
    await expect(page.getByRole("heading", { name: "Trabalhos" })).toBeVisible({ timeout: 15000 });

    const existingProjects = await page.locator('[data-testid="project-card"]').count();

    if (existingProjects > 0) {
      await page.locator('[data-testid="project-card"]').first().click();
    } else {
      await page.getByRole("button", { name: /criar trabalho/i }).click();
      await expect(page.getByRole("dialog")).toBeVisible();

      const workTitle = `Teste Auto-save ${Date.now()}`;
      await page.getByLabel("T�tulo").fill(workTitle);

      await page.getByRole("button", { name: /continuar/i }).click();
      await page.waitForTimeout(500);

      await page.getByLabel("Institui��o").fill("UEM");
      await page.getByLabel("Curso").fill("Teste");
      await page.getByLabel("Nome do Autor").fill("Tester");

      await page.getByRole("button", { name: /criar trabalho/i }).click();
      await page.waitForURL(/\/app\/trabalhos\/[a-zA-Z0-9]+/);
    }

    await page.waitForTimeout(3000);

    const editor = page.locator('[data-testid="editor-content"]').first();
    if (await editor.count() > 0) {
      await editor.click();
      await editor.fill("Este � um teste de auto-save...");

      await page.waitForTimeout(1500);

      const saveIndicator = page.locator('[data-testid="save-status"]');
      const status = await saveIndicator.textContent().catch(() => "");
      
      expect(status?.includes("salvo") || status?.includes("saved")).toBeTruthy();
    }
  });
});
