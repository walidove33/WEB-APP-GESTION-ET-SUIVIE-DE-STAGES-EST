

import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { StageService } from '../../../services/stage.service';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/notification.service';
import { NavbarComponent } from '../../../shared/components/navbar/navbar.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';

import {
  PlanificationSoutenanceResponse,
  DetailSoutenance
} from '../../../models/stage.model';

import { User } from '../../../models/user.model';

@Component({
  selector: 'app-soutenance-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NavbarComponent, LoadingComponent],
  templateUrl: './soutenance-management.component.html',
  styleUrls: ['./soutenance-management.component.scss']
})
export class SoutenanceManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  currentUser: User | null = null;
  planifications: PlanificationSoutenanceResponse[] = [];
  selectedPlanification: PlanificationSoutenanceResponse | null = null;
  planificationDetails: DetailSoutenance[] = [];

  loading = false;
  loadingDetails = false;

  // Filters
  dateFilter = '';

  // newDetail used when Encadrant adds a slot
  newDetail: Partial<DetailSoutenance> = {
    sujet: '',
    heureDebut: '',
    heureFin: '',
    etudiant: undefined // optional; leave undefined for free slot
  };

  constructor(
    private stageService: StageService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.notificationService.info('Gestion Soutenances', 'Chargement de vos planifications de soutenance...');
    this.loadMyPlanifications();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /* ---------- Planifications list ---------- */
  loadMyPlanifications(): void {
    if (!this.currentUser) return;

    this.loading = true;
    this.stageService.getPlanificationsByEncadrant(this.currentUser.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (planifs) => {
          this.planifications = planifs || [];
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.loading = false;
          console.error('loadMyPlanifications error', err);
          this.notificationService.error('Erreur', 'Impossible de charger les planifications.');
          this.cdr.detectChanges();
        }
      });
  }

  getFilteredPlanifications(): PlanificationSoutenanceResponse[] {
    if (!this.dateFilter) return this.planifications;
    return this.planifications.filter(p => p.dateSoutenance?.startsWith(this.dateFilter));
  }

  getUpcomingPlanifications(): PlanificationSoutenanceResponse[] {
    const today = new Date().toISOString().split('T')[0];
    return this.planifications.filter(p => p.dateSoutenance >= today);
  }

  getPastPlanifications(): PlanificationSoutenanceResponse[] {
    const today = new Date().toISOString().split('T')[0];
    return this.planifications.filter(p => p.dateSoutenance < today);
  }

  /* ---------- Select and load details ---------- */
  viewPlanificationDetails(planification: PlanificationSoutenanceResponse): void {
    this.selectedPlanification = planification;
    this.newDetail = { sujet: '', heureDebut: '', heureFin: '' };
    this.loadPlanificationDetails(planification.id);
    this.notificationService.info('Détails', `Affichage des créneaux: ${planification.dateSoutenance}`);
  }

  loadPlanificationDetails(planifId: number): void {
    this.loadingDetails = true;
    this.stageService.getPlanificationDetails(planifId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (details) => {
          this.planificationDetails = details || [];
          this.loadingDetails = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.loadingDetails = false;
          console.error('loadPlanificationDetails error', err);
          this.notificationService.error('Erreur', 'Impossible de charger les détails de la planification.');
          this.cdr.detectChanges();
        }
      });
  }

  backToPlanifications(): void {
    this.selectedPlanification = null;
    this.planificationDetails = [];
    this.notificationService.info('Navigation', 'Retour à la liste des planifications');
  }

  /* ---------- Add a new detail (slot) ---------- */
  addDetail(form: NgForm): void {
    if (!this.selectedPlanification) {
      this.notificationService.error('Erreur', 'Aucune planification sélectionnée.');
      return;
    }

    // Basic client-side validation
    if (!this.newDetail.sujet || !this.newDetail.heureDebut || !this.newDetail.heureFin) {
      this.notificationService.error('Erreur', 'Veuillez remplir tous les champs du créneau.');
      return;
    }

    const payload: Partial<DetailSoutenance> = {
      sujet: this.newDetail.sujet,
      heureDebut: this.newDetail.heureDebut,
      heureFin: this.newDetail.heureFin,
      etudiant: this.newDetail.etudiant ? this.newDetail.etudiant : undefined
    };

    this.stageService.addDetailToPlanification(this.selectedPlanification.id!, payload as DetailSoutenance)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (created: DetailSoutenance) => {
          this.planificationDetails = [...this.planificationDetails, created];
          this.notificationService.success('Succès', 'Créneau ajouté avec succès.');
          form.resetForm();
          this.newDetail = { sujet: '', heureDebut: '', heureFin: '' };
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('addDetail error', err);
          this.notificationService.error('Erreur', 'Impossible d\'ajouter le créneau.');
        }
      });
  }

  /* ---------- Edit / Delete (stubs) ---------- */
  editDetail(detail: DetailSoutenance): void {
    // TODO: show modal or inline form to edit detail
    this.notificationService.info('Modifier', 'Fonction de modification à implémenter.');
  }

  deleteDetail(detail: DetailSoutenance): void {
    if (!confirm('Confirmer la suppression de ce créneau ?')) return;

    this.stageService.deleteDetail(detail.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.planificationDetails = this.planificationDetails.filter(d => d.id !== detail.id);
          this.notificationService.success('Supprimé', 'Le créneau a été supprimé.');
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('deleteDetail error', err);
          this.notificationService.error('Erreur', 'Impossible de supprimer le créneau.');
        }
      });
  }

  /* ---------- Export (opens backend export endpoint) ---------- */
  exportPlanificationToPDF(planification: PlanificationSoutenanceResponse): void {
    if (!planification || !planification.id) {
      this.notificationService.error('Erreur', 'Planification invalide.');
      return;
    }
    const url = `/stages/planification/${planification.id}/export`;
    this.notificationService.info('Export', 'Téléchargement du fichier en cours...');
    window.open(url, '_blank');
  }

  /* ---------- Helpers ---------- */
  formatTime(time: string | undefined): string {
    if (!time) return '';
    return time.length >= 5 ? time.substring(0, 5) : time;
  }

  formatDate(date: string | undefined): string {
    if (!date) return '';
    try {
      return new Date(date).toLocaleDateString('fr-FR', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
    } catch {
      return date;
    }
  }

  getTotalSlots(): number {
    return this.planificationDetails.length;
  }

  getOccupiedSlots(): number {
    return this.planificationDetails.filter(d => !!d.etudiant && !!(d.etudiant as any).id).length;
  }

  getAvailableSlots(): number {
    return this.getTotalSlots() - this.getOccupiedSlots();
  }

  isSlotOccupied(detail: DetailSoutenance): boolean {
    return !!detail.etudiant && !!(detail.etudiant as any).id;
  }

  // Safe name helper for templates (avoids casting inside template)
  getStudentName(detail: DetailSoutenance): string {
    const etu: any = detail.etudiant as any;
    if (!etu) return '';
    return `${etu.prenom || ''} ${etu.nom || ''}`.trim();
  }

  getSlotStatusClass(detail: DetailSoutenance): string {
    return this.isSlotOccupied(detail) ? 'slot-occupied' : 'slot-available';
  }

  getSlotStatusText(detail: DetailSoutenance): string {
    return this.isSlotOccupied(detail) ? 'Occupé' : 'Disponible';
  }
}
