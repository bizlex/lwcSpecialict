import { LightningElement, api, wire } from 'lwc';
import getBoats from '@salesforce/apex/BoatDataService.getBoats';
import updateBoatList from '@salesforce/apex/BoatDataService.updateBoatList';
import { publish, MessageContext } from 'lightning/messageService';
import BoatMC from '@salesforce/messageChannel/BoatMessageChannel__c';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import { getRecordNotifyChange } from 'lightning/uiRecordApi';

const SUCCESS_TITLE = 'Success';
const MESSAGE_SHIP_IT = 'Ship it!';
const SUCCESS_VARIANT = 'success';
const ERROR_TITLE   = 'Error';
const ERROR_VARIANT = 'error';
const CONST_ERROR = 'Error';

export default class BoatSearchResults extends LightningElement {
  selectedBoatId;
  columns = [
    { label: 'Name', fieldName: 'Name', editable: true },
    { label: 'Length', fieldName: 'Length__c', type: 'number', editable: true },
    { label: 'Price', fieldName: 'Price__c', type: 'currency', typeAttributes: { step: '0.01', maximumFractionDigits: '2' }, editable: true },
    { label: 'Description', fieldName: 'Description__c', type: 'text', editable: true }
  ];
  boatTypeId = '';
  boats;
  isLoading = false;
  draftValues = [];
  
  // wired message context
  @wire(MessageContext)
  messageContext;
  // wired getBoats method
  @wire(getBoats, { boatTypeId: '$boatTypeId' })
  wiredBoats(result) { 
    this.boats = result;
    this.isLoading = false;
    this.notifyLoading(this.isLoading);
  }
  
  // public function that updates the existing boatTypeId property
  // uses notifyLoading
  @api
  searchBoats(boatTypeId) {
    this.isLoading = true;
    this.notifyLoading(this.isLoading);
    this.boatTypeId = boatTypeId;
  }

  // this public function must refresh the boats asynchronously
  // uses notifyLoading
  @api
  async refresh() {
    this.isLoading = true;
    this.notifyLoading(this.isLoading);      
    await refreshApex(this.boats);
    this.isLoading = false;
    this.notifyLoading(this.isLoading);   
  }
  
  // this function must update selectedBoatId and call sendMessageService
  updateSelectedTile(event) {
    this.selectedBoatId = event.detail.boatId;
    this.sendMessageService(this.selectedBoatId);
  }
  
  // Publishes the selected boat Id on the BoatMC.
  sendMessageService(boatId) {
    // explicitly pass boatId to the parameter recordId
    publish(this.messageContext, BoatMC, { recordId : boatId });
  }
  
  // The handleSave method must save the changes in the Boat Editor
  // passing the updated fields from draftValues to the 
  // Apex method updateBoatList(Object data).
  // Show a toast message with the title
  // clear lightning-datatable draft values
  handleSave(event) {
    // notify loading
    const updatedFields = event.detail.draftValues;
    console.log('updatedFields = ', updatedFields);
    const notifyChangeIds = updatedFields.map(row => { return { "recordId": row.Id } });
    // Update the records via Apex
    updateBoatList({data: updatedFields})
    .then(() => {
      this.dispatchEvent(
        new ShowToastEvent({
          title: SUCCESS_TITLE,
          message: MESSAGE_SHIP_IT,
          variant: SUCCESS_VARIANT
        })
      );
      getRecordNotifyChange(notifyChangeIds);
      this.draftValues = [];
      this.refresh();
    })
    .catch(error => {
      this.dispatchEvent(
        new ShowToastEvent({
          title: ERROR_TITLE,
          message: CONST_ERROR,
          variant: ERROR_VARIANT
        })
      );
      this.notifyLoading(false);
    })
    .finally(() => {
      this.draftValues = [];
    });
  }
  // Check the current value of isLoading before dispatching the doneloading or loading custom event
  @api
  notifyLoading(isLoading) {
    if (isLoading) {
      this.dispatchEvent(new CustomEvent('loading'));
    } else {
      this.dispatchEvent(CustomEvent('doneloading'));
    }
  }
}