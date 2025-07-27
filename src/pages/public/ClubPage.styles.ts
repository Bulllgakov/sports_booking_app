// Styles for ClubPage component
// Extracted from inline styles for better performance

export const styles = {
  // Loading styles
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: 'var(--background)'
  },
  loadingContent: {
    textAlign: 'center' as const
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid var(--extra-light-gray)',
    borderTopColor: 'var(--primary)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 16px'
  },

  // Error styles
  errorContainer: {
    minHeight: '100vh',
    backgroundColor: 'var(--background)',
    padding: 'var(--spacing-xl)'
  },
  errorCard: {
    maxWidth: '600px',
    margin: '0 auto',
    textAlign: 'center' as const,
    padding: 'var(--spacing-2xl)'
  },
  errorIcon: {
    fontSize: '48px',
    marginBottom: 'var(--spacing-md)'
  },
  errorTitle: {
    marginBottom: 'var(--spacing-sm)'
  },
  errorText: {
    color: 'var(--text-secondary)'
  },

  // Page layout
  pageContainer: {
    minHeight: '100vh',
    backgroundColor: 'var(--background)'
  },
  
  // Hero image styles
  heroImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
    cursor: 'pointer'
  },
  heroPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column' as const,
    gap: '8px',
    backgroundColor: 'var(--extra-light-gray)'
  },
  heroPlaceholderIcon: {
    fontSize: '48px',
    color: 'var(--light-gray)'
  },
  heroPlaceholderText: {
    color: 'var(--gray)'
  },

  // Gallery styles
  desktopGallery: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 'var(--spacing-md)',
    marginBottom: 'var(--spacing-xl)'
  },
  galleryImage: {
    width: '100%',
    height: '150px',
    objectFit: 'cover' as const,
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'transform 0.2s'
  },
  mobileGallery: {
    display: 'flex',
    gap: 'var(--spacing-sm)',
    overflowX: 'auto' as const,
    marginBottom: 'var(--spacing-lg)',
    paddingBottom: 'var(--spacing-sm)',
    WebkitOverflowScrolling: 'touch' as const
  },
  mobileGalleryImage: {
    minWidth: '120px',
    width: '120px',
    height: '80px',
    objectFit: 'cover' as const,
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer'
  },

  // Info sections
  clubInfoWrapper: {
    marginBottom: 'var(--spacing-xl)'
  },
  clubTitle: {
    marginBottom: 'var(--spacing-sm)'
  },
  clubInfoItems: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 'var(--spacing-lg)',
    marginBottom: 'var(--spacing-lg)'
  },
  infoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-xs)'
  },
  infoIcon: {
    color: 'var(--gray)',
    fontSize: 'var(--icon-size-md)'
  },
  ratingValue: {
    color: 'var(--primary-dark)'
  },
  ratingCount: {
    color: 'var(--gray)'
  },

  // Description section
  descriptionSection: {
    marginBottom: 'var(--spacing-lg)'
  },
  descriptionText: {
    color: 'var(--text-secondary)',
    lineHeight: 1.6
  },

  // Working hours
  workingHoursGrid: {
    display: 'grid',
    gap: 'var(--spacing-xs)'
  },
  workingHoursRow: {
    display: 'flex',
    justifyContent: 'space-between'
  },
  workingHoursTime: {
    color: 'var(--gray)'
  },

  // Courts section
  courtsWrapper: {
    marginBottom: 'var(--spacing-lg)'
  },
  courtsWrapperDesktop: {
    marginBottom: '0'
  },
  courtsTitle: {
    marginBottom: 'var(--spacing-lg)'
  },
  noCourtsCard: {
    textAlign: 'center' as const,
    padding: 'var(--spacing-3xl)'
  },
  noCourtsIcon: {
    fontSize: '48px',
    color: 'var(--light-gray)'
  },
  noCourtsText: {
    color: 'var(--gray)',
    marginTop: 'var(--spacing-md)'
  },

  // Court card
  courtCardContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  courtInfo: {
    flex: 1
  },
  courtName: {
    marginBottom: 'var(--spacing-xs)'
  },
  courtDetails: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-xs)',
    flexWrap: 'wrap' as const
  },
  courtPricing: {
    textAlign: 'right' as const,
    minWidth: '120px'
  },
  courtPrice: {
    color: 'var(--primary)'
  },
  courtPriceUnit: {
    color: 'var(--gray)'
  },
  courtIndoor: {
    color: 'var(--gray)'
  },
  courtSurface: {
    color: 'var(--gray)'
  },

  // Desktop sidebar
  sidebarBookingCard: {
    marginBottom: 'var(--spacing-lg)'
  },
  selectedCourtSection: {
    marginBottom: 'var(--spacing-xs)'
  },
  selectedCourtDetails: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  selectedCourtType: {
    color: 'var(--gray)'
  },
  selectedCourtPrice: {
    color: 'var(--primary)'
  },
  bookingButton: {
    width: '100%',
    marginBottom: 'var(--spacing-md)'
  },
  appPromoDesktop: {
    textAlign: 'center' as const,
    padding: 'var(--spacing-md)',
    backgroundColor: 'var(--background)',
    borderRadius: 'var(--radius-md)',
    marginTop: 'var(--spacing-lg)'
  },
  appPromoText: {
    color: 'var(--gray)',
    marginBottom: 'var(--spacing-sm)'
  },
  appPromoButton: {
    background: 'var(--secondary)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: 'var(--spacing-xs) var(--spacing-md)',
    fontSize: 'var(--text-caption)',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--spacing-xs)'
  },

  // Mobile app promo
  mobileAppPromo: {
    position: 'fixed' as const,
    bottom: '140px',
    right: '20px',
    zIndex: 99
  },
  mobileAppPromoButton: {
    background: 'var(--secondary)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius-full)',
    padding: 'var(--spacing-sm) var(--spacing-md)',
    fontSize: 'var(--text-caption)',
    fontWeight: '600',
    boxShadow: 'var(--shadow-lg)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-xs)'
  },

  // Modal styles
  modalBackdrop: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    zIndex: 2000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'var(--spacing-xl)'
  },
  modalContent: {
    position: 'relative' as const,
    maxWidth: '90vw',
    maxHeight: '90vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalCloseButton: {
    position: 'absolute' as const,
    top: '-40px',
    right: '0',
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: '28px',
    cursor: 'pointer',
    padding: '8px',
    zIndex: 10,
    lineHeight: 1
  },
  modalNavButton: {
    position: 'absolute' as const,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    color: 'white',
    fontSize: '24px',
    cursor: 'pointer',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s',
    zIndex: 5
  },
  modalNavButtonHover: {
    background: 'rgba(255, 255, 255, 0.2)'
  },
  modalImage: {
    maxWidth: '100%',
    maxHeight: '90vh',
    objectFit: 'contain' as const,
    borderRadius: 'var(--radius-md)'
  },
  modalPhotoCounter: {
    position: 'absolute' as const,
    bottom: '-30px',
    left: '50%',
    transform: 'translateX(-50%)',
    color: 'white',
    fontSize: '14px',
    fontWeight: '500'
  },

  // Amenities
  amenityItemDesktop: {
    background: 'transparent',
    padding: 'var(--spacing-xs) 0',
    margin: 0
  },
  amenitiesGrid: {
    display: 'grid',
    gap: 'var(--spacing-xs)'
  }
}

// Mobile specific adjustments
export const mobileStyles = {
  contentPadding: {
    padding: 'var(--spacing-xl)'
  },
  courtsWrapper: {
    marginBottom: 'var(--spacing-lg)'
  }
}

// Desktop specific adjustments  
export const desktopStyles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: '1fr 400px',
    gap: 'var(--spacing-2xl)',
    padding: 'var(--spacing-2xl)',
    minHeight: 'calc(100vh - 350px)'
  },
  mainContent: {
    flex: 1
  },
  sidebar: {
    position: 'sticky' as const,
    top: 'var(--spacing-2xl)',
    height: 'fit-content',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--spacing-lg)'
  }
}