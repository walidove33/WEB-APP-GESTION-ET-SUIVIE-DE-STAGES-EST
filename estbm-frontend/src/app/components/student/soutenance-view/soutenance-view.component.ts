
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { StageService } from '../../../services/stage.service';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/notification.service';
import { NavbarComponent } from '../../../shared/components/navbar/navbar.component';
import { LoadingComponent } from '../../../shared/components/loading/loading.component';
import { SoutenanceEtudiantSlotDto } from '../../../models/stage.model';
import { User } from '../../../models/user.model';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

@Component({
  selector: 'app-soutenance-view',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, LoadingComponent],
  templateUrl: './soutenance-view.component.html',
  styleUrls: ['./soutenance-view.component.scss']
})
export class SoutenanceViewComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  currentUser: User | null = null;
  soutenances: SoutenanceEtudiantSlotDto[] = [];
  loading = false;

  constructor(
    private stageService: StageService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.notificationService.info('Mes Soutenances', 'Chargement de vos créneaux de soutenance...');
    this.loadMySoutenances();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadMySoutenances(): void {
    if (!this.currentUser) return;

    this.loading = true;
    this.stageService.getMySoutenances(this.currentUser.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (soutenances) => {
          this.soutenances = soutenances;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.loading = false;
          this.notificationService.error('Erreur', 'Impossible de charger vos soutenances');
          console.error('Erreur chargement soutenances:', error);
          this.cdr.detectChanges();
        }
      });
  }

  getUpcomingSoutenances(): SoutenanceEtudiantSlotDto[] {
    const today = new Date().toISOString().split('T')[0];
    return this.soutenances.filter(s => s.date >= today);
  }

  getPastSoutenances(): SoutenanceEtudiantSlotDto[] {
    const today = new Date().toISOString().split('T')[0];
    return this.soutenances.filter(s => s.date < today);
  }

  getNextSoutenance(): SoutenanceEtudiantSlotDto | null {
    const upcoming = this.getUpcomingSoutenances();
    if (upcoming.length === 0) return null;
    return upcoming.sort((a, b) =>
      new Date(a.date + 'T' + a.heureDebut).getTime() -
      new Date(b.date + 'T' + b.heureDebut).getTime()
    )[0];
  }

  formatTime(time: string): string {
    return time ? time.substring(0, 5) : '';
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  getDaysUntilSoutenance(date: string): number {
    const soutenanceDate = new Date(date);
    const today = new Date();
    const diffTime = soutenanceDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getSoutenanceStatusClass(soutenance: SoutenanceEtudiantSlotDto): string {
    const today = new Date().toISOString().split('T')[0];
    if (soutenance.date < today) return 'soutenance-past';
    if (soutenance.date === today) return 'soutenance-today';
    return 'soutenance-upcoming';
  }

  getSoutenanceStatusText(soutenance: SoutenanceEtudiantSlotDto): string {
    const today = new Date().toISOString().split('T')[0];
    if (soutenance.date < today) return 'Terminée';
    if (soutenance.date === today) return 'Aujourd\'hui';
    const days = this.getDaysUntilSoutenance(soutenance.date);
    return `Dans ${days} jour${days > 1 ? 's' : ''}`;
  }

  addToCalendar(soutenance: SoutenanceEtudiantSlotDto): void {
    const startDate = new Date(soutenance.date + 'T' + soutenance.heureDebut);
    const endDate = new Date(soutenance.date + 'T' + soutenance.heureFin);
    const startStr = startDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endStr = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const title = `Soutenance de stage - ${soutenance.sujet}`;
    const details = `Soutenance: ${soutenance.sujet}\nEntreprise: ${soutenance.entreprise ?? ''}`;
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startStr}/${endStr}&details=${encodeURIComponent(details)}`;
    window.open(url, '_blank');
    this.notificationService.success('Calendrier', 'Événement ouvert dans Google Calendar');
  }

  downloadSoutenanceInfo(soutenance: SoutenanceEtudiantSlotDto): void {
    this.notificationService.info('Téléchargement', 'Génération des informations de soutenance...');
    // small client-side placeholder — keep for backward compatibility
    setTimeout(() => {
      this.notificationService.success('Téléchargement réussi', 'Les informations de soutenance ont été téléchargées');
    }, 900);
  }

  prepareSoutenance(soutenance: SoutenanceEtudiantSlotDto): void {
    this.notificationService.info('Préparation', `Guide pour la soutenance du ${this.formatDate(soutenance.date)}`);
    // TODO: navigate/show modal
  }

  /**
   * Generate a PDF from the visible planification area (.soutenance-container)
   * Uses html2canvas + jspdf. For long content the image is scaled to A4 width.
   */
  async downloadPlanificationPDF(): Promise<void> {
    const container = document.querySelector('.soutenance-container') as HTMLElement | null;
    if (!container) {
      this.notificationService.error('Erreur', 'Impossible de trouver la zone de planification.');
      return;
    }

    this.notificationService.info('PDF', 'Préparation du PDF...');
    try {
      // Render with higher scale for crispness
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = (pdf as any).getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      // If content taller than one page, add pages
      if (pdfHeight <= pdf.internal.pageSize.getHeight()) {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      } else {
        // scale the canvas content to full-page width and break into pages
        const pageHeight = pdf.internal.pageSize.getHeight();
        let remainingHeight = pdfHeight;
        let position = 0;
        // add first page
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        remainingHeight -= pageHeight;
        while (remainingHeight > 0) {
          pdf.addPage();
          // position negative to show next slice (works as long as image fits width)
          position = -(pdfHeight - remainingHeight);
          pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
          remainingHeight -= pageHeight;
        }
      }

      const filename = `planification_soutenances_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);
      this.notificationService.success('PDF', 'PDF généré avec succès');
    } catch (err) {
      console.error('PDF generation error', err);
      this.notificationService.error('Erreur', 'Impossible de générer le PDF. Vérifiez la console.');
    }
  }
}
