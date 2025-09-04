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
  addDetail(form: NgForm | PlanificationSoutenanceResponse): void {
    // Handle both form submission and direct planification selection
    if (form instanceof NgForm) {
      this.handleFormSubmission(form);
    } else {
      this.handlePlanificationSelection(form);
    }
  }

  private handleFormSubmission(form: NgForm): void {
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

  private handlePlanificationSelection(planification: PlanificationSoutenanceResponse): void {
    this.selectedPlanification = planification;
    this.loadPlanificationDetails(planification.id);
  }

  /* ---------- Edit / Delete ---------- */
  editDetail(detail: DetailSoutenance): void {
    this.notificationService.info('Modifier', 'Fonction de modification à implémenter.');
  }

  deleteDetail(detail: DetailSoutenance): void {
    this.notificationService.warning(
      'Confirmer la suppression',
      `Êtes-vous sûr de vouloir supprimer ce créneau (${this.formatTime(detail.heureDebut)} - ${this.formatTime(detail.heureFin)}) ?`,
      0,
      [
        {
          label: 'Annuler',
          style: 'secondary',
          action: () => {
            this.notificationService.info('Suppression annulée', 'Le créneau a été conservé');
          }
        },
        {
          label: 'Supprimer',
          style: 'danger',
          action: () => {
            this.performDeleteDetail(detail);
          }
        }
      ]
    );
  }

  private performDeleteDetail(detail: DetailSoutenance): void {
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

  /* ---------- Export ---------- */
  exportPlanificationToPDF(planification: PlanificationSoutenanceResponse): void {
    if (!planification || !planification.id) {
      this.notificationService.error('Erreur', 'Planification invalide.');
      return;
    }
    const url = `http://localhost:8081/stages/planification/${planification.id}/export`;
    this.notificationService.info('Export', 'Téléchargement du fichier Excel en cours...');
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

  getRelativeDate(date: string): string {
    const today = new Date();
    const targetDate = new Date(date);
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Aujourd\'hui';
    if (diffDays === 1) return 'Demain';
    if (diffDays === -1) return 'Hier';
    if (diffDays > 0) return `Dans ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    return `Il y a ${Math.abs(diffDays)} jour${Math.abs(diffDays) > 1 ? 's' : ''}`;
  }

  getPlanificationStatusClass(planification: PlanificationSoutenanceResponse): string {
    const today = new Date().toISOString().split('T')[0];
    if (planification.dateSoutenance < today) return 'status-past';
    if (planification.dateSoutenance === today) return 'status-today';
    return 'status-upcoming';
  }

  getPlanificationStatusText(planification: PlanificationSoutenanceResponse): string {
    const today = new Date().toISOString().split('T')[0];
    if (planification.dateSoutenance < today) return 'Terminée';
    if (planification.dateSoutenance === today) return 'Aujourd\'hui';
    return 'À venir';
  }

  getPlanificationStatusIcon(planification: PlanificationSoutenanceResponse): string {
    const today = new Date().toISOString().split('T')[0];
    if (planification.dateSoutenance < today) return 'bi-check-circle';
    if (planification.dateSoutenance === today) return 'bi-clock';
    return 'bi-calendar-event';
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

  getStudentName(detail: DetailSoutenance): string {
    const etu: any = detail.etudiant as any;
    if (!etu) return '';
    return `${etu.prenom || ''} ${etu.nom || ''}`.trim();
  }

  getStudentInitials(detail: DetailSoutenance): string {
    const etu: any = detail.etudiant as any;
    if (!etu) return '?';
    const firstInitial = (etu.prenom || '').charAt(0);
    const lastInitial = (etu.nom || '').charAt(0);
    return `${firstInitial}${lastInitial}`.toUpperCase();
  }

  getSlotStatusClass(detail: DetailSoutenance): string {
    return this.isSlotOccupied(detail) ? 'slot-occupied' : 'slot-available';
  }

  getSlotStatusText(detail: DetailSoutenance): string {
    return this.isSlotOccupied(detail) ? 'Assigné' : 'Libre';
  }

  getDuration(heureDebut: string, heureFin: string): string {
    if (!heureDebut || !heureFin) return '';
    
    const debut = new Date(`2000-01-01T${heureDebut}`);
    const fin = new Date(`2000-01-01T${heureFin}`);
    const diffMs = fin.getTime() - debut.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 60) {
      return `${diffMins} min`;
    } else {
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return mins > 0 ? `${hours}h${mins}` : `${hours}h`;
    }
  }

  // Animation and UI helpers
  animateSlotCreation(): void {
    const newSlot = document.querySelector('.slot-item:last-child');
    if (newSlot) {
      newSlot.classList.add('animate-slideInUp');
    }
  }

  animateSlotDeletion(slotId: number): void {
    const slot = document.querySelector(`[data-slot-id="${slotId}"]`);
    if (slot) {
      slot.classList.add('animate-slideOutRight');
    }
  }
}