


import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { NotificationService } from './notification.service';
import {
  PlanificationSoutenanceResponse,
  DetailSoutenance,
  SoutenanceEtudiantSlotDto
} from '../models/stage.model';

@Injectable({
  providedIn: 'root'
})
export class PlanificationService {
  // base for planification endpoints
  private baseUrl = 'http://localhost:8081/stages/planification';
  // base for other admin endpoints (class-groups, admin lists, etc.)
  private apiBase = 'http://localhost:8081/stages';

  constructor(
    private http: HttpClient,
    private notificationService: NotificationService
  ) {}

  // Admin: Get all planifications -> GET /stages/planification/all
  getAll(): Observable<PlanificationSoutenanceResponse[]> {
    const loadingId = this.notificationService.loading('Chargement des planifications...', 'Récupération de toutes les planifications');
    return this.http.get<PlanificationSoutenanceResponse[]>(`${this.baseUrl}/all`).pipe(
      tap((planifications) => {
        this.notificationService.operationSuccess(loadingId, 'Planifications', `${planifications.length} planification(s) chargée(s)`);
      }),
      catchError((error) => {
        this.notificationService.operationError(loadingId, 'Planifications', 'Impossible de charger les planifications');
        return this.handleError(error);
      })
    );
  }

  // Encadrant: Get planifications by supervisor -> GET /stages/planification/encadrant/{id}
  getByEncadrant(encadrantId: number): Observable<PlanificationSoutenanceResponse[]> {
    const loadingId = this.notificationService.loading('Chargement de vos planifications...', 'Récupération des planifications assignées');
    return this.http.get<PlanificationSoutenanceResponse[]>(`${this.baseUrl}/encadrant/${encadrantId}`).pipe(
      tap((planifications) => {
        this.notificationService.operationSuccess(loadingId, 'Mes planifications', `${planifications.length} planification(s) trouvée(s)`);
      }),
      catchError((error) => {
        this.notificationService.operationError(loadingId, 'Mes planifications', 'Impossible de charger vos planifications');
        return this.handleError(error);
      })
    );
  }

  // Étudiant: Get student's soutenance slots -> GET /stages/planification/etudiant/{id}
  getByEtudiant(etudiantId: number): Observable<SoutenanceEtudiantSlotDto[]> {
    const loadingId = this.notificationService.loading('Chargement de vos créneaux...', 'Récupération de vos soutenances programmées');
    return this.http.get<SoutenanceEtudiantSlotDto[]>(`${this.baseUrl}/etudiant/${etudiantId}`).pipe(
      tap((soutenances) => {
        this.notificationService.operationSuccess(loadingId, 'Mes soutenances', `${soutenances.length} créneau(x) programmé(s)`);
      }),
      catchError((error) => {
        this.notificationService.operationError(loadingId, 'Mes soutenances', 'Impossible de charger vos créneaux');
        return this.handleError(error);
      })
    );
  }

  // Add detail to planification -> POST /stages/planification/{planifId}/addDetail
  addDetail(planifId: number, detail: DetailSoutenance): Observable<DetailSoutenance> {
    const loadingId = this.notificationService.loading('Ajout du créneau...', 'Enregistrement du nouveau créneau de soutenance');
    return this.http.post<DetailSoutenance>(`${this.baseUrl}/${planifId}/addDetail`, detail).pipe(
      tap((newDetail) => {
        this.notificationService.operationSuccess(loadingId, 'Créneau ajouté', `Nouveau créneau créé: ${newDetail.heureDebut} - ${newDetail.heureFin}`);
      }),
      catchError((error) => {
        this.notificationService.operationError(loadingId, 'Ajout créneau', 'Impossible d\'ajouter le créneau');
        return this.handleError(error);
      })
    );
  }

  // Get planification details -> GET /stages/planification/{planifId}/details
  getDetails(planifId: number): Observable<DetailSoutenance[]> {
    const loadingId = this.notificationService.loading('Chargement des créneaux...', 'Récupération des détails de planification');
    return this.http.get<DetailSoutenance[]>(`${this.baseUrl}/${planifId}/details`).pipe(
      tap((details) => {
        this.notificationService.operationSuccess(loadingId, 'Créneaux', `${details.length} créneau(x) trouvé(s)`);
      }),
      catchError((error) => {
        this.notificationService.operationError(loadingId, 'Créneaux', 'Impossible de charger les créneaux');
        return this.handleError(error);
      })
    );
  }

  // Update detail -> PUT /stages/planification/details/{detailId}
  updateDetail(detailId: number, detail: DetailSoutenance) {
    const loadingId = this.notificationService.loading('Mise à jour du créneau...', 'Sauvegarde des modifications');
    return this.http.put<DetailSoutenance>(`${this.baseUrl}/details/${detailId}`, detail).pipe(
      tap((updatedDetail) => {
        this.notificationService.operationSuccess(loadingId, 'Créneau mis à jour', `Créneau modifié: ${updatedDetail.heureDebut} - ${updatedDetail.heureFin}`);
      }),
      catchError((error) => {
        this.notificationService.operationError(loadingId, 'Mise à jour', 'Impossible de mettre à jour le créneau');
        return this.handleError(error);
      })
    );
  }

  // Delete detail -> DELETE /stages/planification/details/{detailId}
  deleteDetail(detailId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/details/${detailId}`).pipe(catchError(err => this.handleError(err)));
  }

  // Create planification (Admin) -> POST /stages/planification/create
  create(planification: any): Observable<PlanificationSoutenanceResponse> {
    const loadingId = this.notificationService.loading('Création de la planification...', 'Enregistrement de la nouvelle planification');
    return this.http.post<PlanificationSoutenanceResponse>(`${this.baseUrl}/create`, planification).pipe(
      tap((newPlanification) => {
        this.notificationService.operationSuccess(loadingId, 'Planification créée', `Planification du ${newPlanification.dateSoutenance} créée avec succès`);
      }),
      catchError((error) => {
        this.notificationService.operationError(loadingId, 'Création planification', 'Impossible de créer la planification');
        return this.handleError(error);
      })
    );
  }

  // --- Export endpoints (fixed) ---
  // Download all planifs for encadrant as Excel -> GET /stages/planification/encadrant/{id}/export
  downloadPlanificationsExcel(encadrantId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/encadrant/${encadrantId}/export`, { responseType: 'blob' });
  }

  // Download single planification details as Excel -> GET /stages/planification/{planifId}/export
  downloadPlanificationExcel(planifId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${planifId}/export`, { responseType: 'blob' });
  }

  // List students by class group -> note: this endpoint lives under /stages/admin/...
  listStudentsByClassGroup(classGroupId: number): Observable<Array<{ id:number, nom?:string, prenom?:string }>> {
    return this.http.get<Array<{ id:number, nom?:string, prenom?:string }>>(`${this.apiBase}/admin/class-groups/${classGroupId}/etudiants`);
  }

  // Helper: save blob client-side
  downloadBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);     // <- important for some browsers
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  // --- error handler
  private handleError(error: any): Observable<never> {
    console.error('PlanificationService error:', error);
    let message = 'Une erreur est survenue';
    if (error?.status === 0) message = 'Impossible de se connecter au serveur';
    else if (error?.status === 401) message = 'Session expirée';
    else if (error?.error?.message) message = error.error.message;
    return throwError(() => new Error(message));
  }
}