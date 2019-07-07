import { h, Component } from 'preact';

import ContentAPI from '../API';

// images processors
import mergeImages from 'merge-images'; // https://www.npmjs.com/package/merge-images
import AvatarEditor from 'react-avatar-editor'; // https://www.npmjs.com/package/react-avatar-editor

// function libraries
import JSZip from 'jszip'; // https://stuk.github.io/jszip/
import FileSaver from 'file-saver'; // https://github.com/eligrey/FileSaver.js
import DropToUpload from 'react-drop-to-upload'; // https://www.npmjs.com/package/react-drop-to-upload

// Material UI - http://www.material-ui.com/#/ && https://material-ui.com/
import AppBar from 'material-ui/AppBar';
import Avatar from 'material-ui/Avatar';
import {Toolbar, ToolbarGroup, ToolbarSeparator, ToolbarTitle} from 'material-ui/Toolbar';
import Typography from 'material-ui/Typography';
import MenuIcon from 'material-ui/Menu';
import { FormControlLabel, FormGroup } from 'material-ui/Form';
import Menu, { MenuItem, MenuList } from 'material-ui/Menu';
import { ArrowDropDown, Close, MoreVert, LockOpen, LockOutline, CropRotate, GridOn, GridOff, AttachFile, Attachment, Wallpaper, PlaylistAddCheck, ArtTrack, PermMedia, Edit, BrandingWatermark, FileDownload, FileUpload, FeaturedPlayList } from 'material-ui-icons';
import Card, { CardHeader, CardMedia, CardContent, CardActions } from 'material-ui/Card';
import Dialog from 'material-ui/Dialog';
import Popover from 'material-ui/Popover';
import Divider from 'material-ui/Divider';
import Button from 'material-ui/Button';
import IconButton from 'material-ui/IconButton';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import Grow from 'material-ui/transitions/Grow';
import Paper from 'material-ui/Paper';
import { withStyles } from 'material-ui/styles';
import { Manager, Target, Popper } from 'react-popper';
import ClickAwayListener from 'material-ui/utils/ClickAwayListener';
import Slide from 'material-ui/transitions/Slide';
import Tooltip from 'material-ui/Tooltip';
import Slider from 'rc-slider'; // https://www.npmjs.com/package/rc-slider

import ExpansionPanel, {
  ExpansionPanelDetails,
  ExpansionPanelSummary,
  ExpansionPanelActions
} from 'material-ui/ExpansionPanel';



export default class ImageTool extends Component {

  constructor(props) {

    super(props);

    const { imageFlavors } = props;

    const contentfulImageFlavors = imageFlavors ? imageFlavors : null;

    this.setState({

      // predetermined flavors
      imageFlavors: require('../image_flavors.json'),

      // defaults // TODO save these to local storage for user
      imageType: 'jpg',
      imageFormat: 'image/' + this.state.imageType,
      globalOverlay: 'matcha',
      useLongFileName: false,

      // og img
      image: {
        original: {
          title: '', // title/name of the uploaded image ex. 'good_burger'
          // TODO data vs string vs url??? are these all still used?
          data: '', // the raw data of the uploaded image
          url: '',
          string: ''
        }
      },

      // options
      imageTypeOptions: ['jpg', 'png'],
      globalOverlayFlavors: ['poke', 'fig', 'matcha', 'figMatcha'], // TODO loop thru something to make this array list
      globalOverlayColors: {
        'poke': '#FF7372',
        'fig': '#7F4B6D',
        'matcha': '#7DC240',
        'figMatcha': '#7F4B6D'
      },

      // poppers
      globalOverlaysPopperOpen: false,
      flavorsPopperOpen: false,
      imageTypesPopperOpen: false,
      individualOverlayPopperOpen: false,
      anchorEl: null,
      expanded: null

    });

    // if Contenful JSON, use it instead
    this.state.imageFlavors = contentfulImageFlavors ? contentfulImageFlavors : this.state.imageFlavors;

    // add flavor settings that aren't yet unique
    this.state.imageFlavors.map((imageFlavor, i) => {

      imageFlavor.quality = 1; // always use 100%
      imageFlavor.dims.scale = 1; // scale slider at 1
      imageFlavor.selected = true; // all on by default

      imageFlavor.image = null; // made on upload build and re-made on edit
      imageFlavor.b64 = null; // image in base64 code
      imageFlavor.devicePreview = null; // devicePreview
      imageFlavor.editorOpen = false;

    });

  }

  componentDidMount(props) {

    this.state.imageFlavors.map((imageFlavor, i) => {

      if (imageFlavor.overlay){
        imageFlavor.useOverlay = imageFlavor.useOverlay || 'matcha';
      }

      // load up the overlay images - they're external so load em up once and load em up before other things happens
      if (imageFlavor.useOverlay){

        // Matcha Overlay
        imageFlavor.overlayImageMatcha = new Image(imageFlavor.dims.width,imageFlavor.dims.height);
        imageFlavor.overlayImageMatcha.setAttribute('crossOrigin', 'anonymous'); // let the image go cross origin
        imageFlavor.overlayImageMatcha.src = imageFlavor.overlay.matcha;

        // Poke Overlay
        imageFlavor.overlayImagePoke = new Image(imageFlavor.dims.width,imageFlavor.dims.height);
        imageFlavor.overlayImagePoke.setAttribute('crossOrigin', 'anonymous'); // let the image go cross origin
        imageFlavor.overlayImagePoke.src = imageFlavor.overlay.poke;

        // Fig Overlay
        imageFlavor.overlayImageFig = new Image(imageFlavor.dims.width,imageFlavor.dims.height);
        imageFlavor.overlayImageFig.setAttribute('crossOrigin', 'anonymous'); // let the image go cross origin
        imageFlavor.overlayImageFig.src = imageFlavor.overlay.fig;

        // Fig + Matcha Overlay
        imageFlavor.overlayImageFigMatcha = new Image(imageFlavor.dims.width,imageFlavor.dims.height);
        imageFlavor.overlayImageFigMatcha.setAttribute('crossOrigin', 'anonymous'); // let the image go cross origin
        imageFlavor.overlayImageFigMatcha.src = imageFlavor.overlay.figMatcha;

      }
    });
  }

  componentWillUnmount(props) {
    clearTimeout(this.timeout);
  }

  componentDidUpdate(props) {}

  handleDragonDropOnOver(event){
    // TODO: this isn't working
    const dragonDropElement = document.querySelector('.image-automator .dragon_drop');
    dragonDropElement.classList.add('hover');
  }

  handleDragonDropOnLeave(event){
    // TODO: this isn't working
    const dragonDropElement = document.querySelector('.image-automator .dragon_drop');
    dragonDropElement.classList.remove('hover');
  }

  /* upload the image */
  handleUploadImage(event){

    // close the toolbar
    if (this.fileUploadMoreButton){this.fileUploadMoreButton.click();}

    const uploadedImage = event[0] || event.target.files[0];
    const reader  = new FileReader();

    // make a serial number from the date YYYYMMDDHHMMSS
    let serialNumer = new Date();
    serialNumer = serialNumer.getFullYear() +
                  ('0' + serialNumer.getMonth()).slice(-2) +
                  ('0' + serialNumer.getDate()).slice(-2) +
                  ('0' + serialNumer.getHours()).slice(-2) +
                  ('0' + serialNumer.getMinutes()).slice(-2) +
                  ('0' + serialNumer.getSeconds()).slice(-2);

    let uploadedImageName = uploadedImage.name;
    uploadedImageName = uploadedImageName.substr(0, uploadedImageName.lastIndexOf('.')); // cut off the '.jpg'
    this.state.image.original.name = uploadedImageName;
    this.state.image.original.data = uploadedImage;

    // loop thru the flavors and ... make file name
    this.state.imageFlavors.map((imageFlavor, i) => {

      // ... make file name
      const fileName = this.state.image.original.name + '_' + imageFlavor.id + '.' + this.state.imageType;
      imageFlavor.fileName = fileName;

    });

    // when the file reader loads
    reader.onload = () => {

      // make a new image and fill it with the uploaded pic
      let image = new Image();
      image.src = reader.result;

      //set the og img
      this.state.image.original.string = reader.result;

      this.state.imageFlavors.map((imageFlavor, i) => {

        if (imageFlavor.selected){

          let preCanvas = document.createElement('canvas');
          preCanvas.width = imageFlavor.dims.width;
          preCanvas.height = imageFlavor.dims.height;
          let preContext = preCanvas.getContext('2d');

          let canvas = document.createElement('canvas');
          canvas.width = imageFlavor.dims.width;
          canvas.height = imageFlavor.dims.height;
          let context = canvas.getContext('2d');

          let drawX = 0;
          let drawY = 0;

          let ogImg = new Image(image.width, image.height);

          ogImg.src = reader.result;
          ogImg.onload = () => {

            console.log('--------');

            console.log('original image size: ' + image.width + 'x' + image.height);
            console.log('flavor size: ' + imageFlavor.dims.width + 'x' + imageFlavor.dims.height);

            const x_dif = image.width * (imageFlavor.dims.height/image.height);
            console.log('x_dif',x_dif);

            const y_dif = image.height * (imageFlavor.dims.width/image.width);
            console.log('y_dif',y_dif);

            if (x_dif > y_dif){

              console.log('x_dif is greater');

              const x_dim = image.width * (imageFlavor.dims.height/image.height);
              drawX = (x_dim - imageFlavor.dims.width)/2;
              console.log('x_dim',x_dim);
              console.log('scale image to X: ' + x_dim + ' Y: ' + imageFlavor.dims.height);
              preCanvas.width = x_dim;
              preContext.drawImage(ogImg,
                0,0,
                image.width,image.height,
                0,0,
                x_dim,imageFlavor.dims.height
              );

            } else {

              console.log('y_dif is greater');

              const y_dim = image.height * (imageFlavor.dims.width/image.width);
              drawY = (y_dim - imageFlavor.dims.height)/2;
              console.log('y_dim',y_dim);
              console.log('scale image to X: ' + imageFlavor.dims.width + ' Y: ' + y_dim);
              preCanvas.height = y_dim;
              preContext.drawImage(ogImg,
                0,0,
                image.width,image.height,
                0,0,
                imageFlavor.dims.width,y_dim
              );

            }

            console.log('start the image at ' + drawX + 'x' + drawY);

            console.log('--------');

            context.drawImage(preCanvas,

              drawX,drawY, // Start at 10 pixels from the left and the top of the image (crop),

              imageFlavor.dims.width, imageFlavor.dims.height, // "Get" a `80 * 30` (w * h) area from the source image (crop),

              0, 0, // Place the result at 0, 0 in the canvas,

              imageFlavor.dims.width, imageFlavor.dims.height // With as width / height: 160 * 60 (scale)

            );

            imageFlavor.image = canvas.toDataURL();

            this.forceUpdate(); // TODO use setState to update instead of hacking an update // this.setState({ image: e.target.files[0] })

            this.buildImageFlavor(imageFlavor, true);

            canvas.remove();
            preCanvas.remove();

          }; // end load listener

        }

      });

    };

    reader.readAsDataURL(uploadedImage);

  }

  /* build image */
  buildImageFlavor(imageFlavor){

    // define merge options
    const mergeOptions = {};
    mergeOptions.width = imageFlavor.dims.width;
    mergeOptions.height = imageFlavor.dims.height;
    mergeOptions.quality = imageFlavor.quality;
    mergeOptions.format = imageFlavor.format;

    // set the base image
    const baseImage = imageFlavor.image;

    // figure out which overlay to use
    let overlayImage_b64 = '';

    if (imageFlavor.useOverlay){

      const overlayImage_img = imageFlavor.useOverlay === 'matcha' ? imageFlavor.overlayImageMatcha :
        imageFlavor.useOverlay === 'poke' ? imageFlavor.overlayImagePoke :
          imageFlavor.useOverlay === 'fig' ? imageFlavor.overlayImageFig :
            imageFlavor.useOverlay === 'figMatcha' ? imageFlavor.overlayImageFigMatcha : '';

      overlayImage_b64 = this.getBase64Image(overlayImage_img);

    } else {

      overlayImage_b64 = baseImage;

    }

    mergeImages([
      {src: baseImage, x:0, y:0 },
      {src: overlayImage_b64, x:0, y:0 }
    ],[mergeOptions])
      .then(
        (b64) => {
          document.getElementById(imageFlavor.id).src = b64;
          // imageFlavor.b64 = b64.replace(/^data:image\/[^;]+/, 'data:application/octet-stream'); // was using this with old download method - leaving in for history sake
          imageFlavor.b64 = b64;
          this.forceUpdate();
        })
      .catch(
        () => {
          console.log('image merge errors'); // Oh NO!!
          alert('Something broke, if this persists, tell someone.');
        }
      );

  }

  buildImageFlavorDevicePreview(imageFlavor){

    const newCropImage = imageFlavor.editor.getImageScaledToCanvas().toDataURL();

    // define merge options
    const mergeOptions = {};
    mergeOptions.width = imageFlavor.dims.width;
    mergeOptions.height = imageFlavor.dims.height;
    mergeOptions.quality = imageFlavor.quality;
    mergeOptions.format = imageFlavor.format;

    // set the base image
    const baseImage = newCropImage;

    // figure out which overlay to use
    let overlayImage_b64 = '';

    if (imageFlavor.useOverlay){

      const overlayImage_img = imageFlavor.useOverlay === 'matcha' ? imageFlavor.overlayImageMatcha :
        imageFlavor.useOverlay === 'poke' ? imageFlavor.overlayImagePoke :
          imageFlavor.useOverlay === 'fig' ? imageFlavor.overlayImageFig :
            imageFlavor.useOverlay === 'figMatcha' ? imageFlavor.overlayImageFigMatcha : '';

      overlayImage_b64 = this.getBase64Image(overlayImage_img);

    } else {

      overlayImage_b64 = baseImage;

    }

    mergeImages([
      {src: baseImage, x:0, y:0 },
      {src: overlayImage_b64, x:0, y:0 }
    ],[mergeOptions])
      .then(
        (b64) => {
          document.getElementById(imageFlavor.id + '-device-preview').src = b64;
          // imageFlavor.b64 = b64.replace(/^data:image\/[^;]+/, 'data:application/octet-stream'); // was using this with old download method - leaving in for history sake
          imageFlavor.b64 = b64;
          this.forceUpdate();
        })
      .catch(
        () => {
          console.log('image merge errors'); // Oh NO!!
          alert('Something broke, if this persists, tell someone.');
        }
      );

  }

  buildAllImageFlavors(){

    this.state.imageFlavors.map((imageFlavor, i) => { // loop thru the flavors

      if (imageFlavor.selected){ // if flavor is selected && if flavor has image

        this.buildImageFlavor(imageFlavor); // then build this flavor

      }

    });

  }

  handleGlobalImageType(type){

    // set the new image type variables
    this.setState({
      imageType: type, // .png
      format: 'image/' + type.replace(/^\./, '') // image/png
    });

    // loop thru the flavors and ...
    this.state.imageFlavors.map((imageFlavor, i) => {

      let newFileName = this.state.image.original.name + '_' + imageFlavor.id + '.' + this.state.imageType; // make the file name (name + flavor + number )
      imageFlavor.fileName = newFileName;

      if (imageFlavor.selected){
        this.buildImageFlavor(imageFlavor); // ... rebuild the image with new imageType
      }

    });

  }

  handleGlobalRotate(){
    alert('rotate not built yet');
  }

  handlePopoverClick(event, id){

    event.preventDefault();

    // TODO this method sucks! make a better popover toggle function

    if (id === 'imageTypesPopover'){ this.setState({ imageTypesPopoverOpen: true, popoverAnchorEl: event.currentTarget }); } else

    if (id === 'overlayPopover'){ this.setState({ overlayPopoverOpen: true, popoverAnchorEl: event.currentTarget }); } else

    if (id === 'overlaysPopover'){ this.setState({ overlaysPopoverOpen: true, popoverAnchorEl: event.currentTarget }); } else

    if (id === 'flavorsPopover'){ this.setState({ flavorsPopoverOpen: true, popoverAnchorEl: event.currentTarget }); }

  };

  handlePopoverClose(){

    this.setState({
      overlaysPopoverOpen: false,
      overlayPopoverOpen: false,
      flavorsPopoverOpen: false,
      imageTypesPopoverOpen: false
    });

  };

  handleFlavorChoices(event, i){

    let imageFlavor = this.state.imageFlavors[i];

    imageFlavor.selected = !imageFlavor.selected;

    this.forceUpdate(); // TODO use setState to update instead of hacking an update

    this.buildAllImageFlavors();

  }

  handleEditorLoadSuccess(imgInfo, i){

  }

  handleEditorOpenClose(i, io){

    const pageBody = document.querySelector('.page-wrapper');
    const automatorBody = document.querySelector('.image-automator');

    if (io === 'close'){

      if (automatorBody) { automatorBody.classList.remove('editor-open'); }
      if (pageBody) { pageBody.classList.remove('editor-open'); }

      const imageFlavor = this.state.imageFlavors[i];

      imageFlavor.editorOpen = false;

      this.forceUpdate(); // TODO use setState to update instead of hacking an update. // this.setState({ })

    } else {

      if (automatorBody) { automatorBody.classList.add('editor-open'); }
      if (pageBody) { pageBody.classList.add('editor-open'); }

      const imageFlavor = this.state.imageFlavors[i];

      imageFlavor.editorOpen = !imageFlavor.editorOpen;
      this.forceUpdate(); // TODO use setState to update instead of hacking an update. // this.setState({ })

      // HACK: device preview must happen after editor is fully open and loaded
      this.timeout = setTimeout(() => {
        this.buildImageFlavorDevicePreview(imageFlavor);
      },200);

    }

  };

  handleImageScale(event, value, i) {

    console.log(event);

    const imageFlavor = this.state.imageFlavors[i];
    // const scale = event.target.valueAsNumber ? event.target.valueAsNumber : value;
    const scale = event;

    imageFlavor.dims.scale = scale;

    this.forceUpdate(); // TODO use setState to update dims instead of hacking an update. // this.setState({ })

    // this.buildImageFlavorDevicePreview(imageFlavor);

  }

  handleEditorPositionChange(event, i) {

    const imageFlavor = this.state.imageFlavors[i];

    imageFlavor.dims.position = {};
    imageFlavor.dims.position.x = event.x;
    imageFlavor.dims.position.y = event.y;

    this.forceUpdate(); // TODO use setState to update instead of hacking an update. // this.setState({ })

  }

  handleEditorSave(i){

    this.handleImageCrop(i);

    this.handleEditorOpenClose(i, 'close');

  }

  handleImageCrop(i) {

    const imageFlavor = this.state.imageFlavors[i];
    const newCropImage = imageFlavor.editor.getImageScaledToCanvas().toDataURL();

    imageFlavor.image = newCropImage;

    this.forceUpdate(); // TODO use setState to update instead of hacking an update

    this.buildImageFlavor(imageFlavor);

  }

  handleOverlayChange(event, value, i) {

    const imageFlavor = this.state.imageFlavors[i];

    let newOverlayImageColor = value || event.target.textContent.toLowerCase();

    imageFlavor.useOverlay = newOverlayImageColor;

    this.forceUpdate(); // TODO use setState to update overlay type instead of hacking an update

  };

  handleGlobalOverlaysChange(event, flavor){

    let imageFlavors = this.state.imageFlavors;

    this.state.imageFlavors.map((imageFlavor, i) => {

      this.setState({ globalOverlay: flavor });

      if (imageFlavor.useOverlay){

        imageFlavor.useOverlay = this.state.globalOverlay;

        let newFileName = this.state.image.original.name + '_' + imageFlavor.id + '.' + this.state.imageType; // make the file name (name + flavor + number )
        imageFlavor.fileName = newFileName;

        this.forceUpdate(); // TODO use setState to update instead of hacking an update

        if (imageFlavor.selected){
          this.buildImageFlavor(imageFlavor);
        }

      }

    });

  }

  handleDownloadImage(i) {

    const imageFlavor = this.state.imageFlavors[i];

    let zip = new JSZip();

    // Add an top-level text file with contents
    zip.file('README.txt', 'Hello UberEats World!\nThank you for using the the UberEats Automatic Image Maker\nMore things to come - stay tuned!');

    // Generate a directory within the Zip file structure
    let img = zip.folder('image');

    // Add a file to the directory, in this case an image with data URI as contents - example img.file("smile.gif", imgData, {base64: true});

    let tBase64 = imageFlavor.b64.replace(/^data:image\/png;base64,/, '').replace(/^data:image\/jpg;base64,/, '');

    img.file(imageFlavor.fileName, tBase64, {base64: true} );

    let zipName = imageFlavor.fileName.replace(/\.png/, '').replace(/\.jpg/, '');


    // {() => this.fileUpload.click()}
    zip.generateAsync({type:'blob'}).then((blob) => {

      let serialNumer = new Date();
      serialNumer = serialNumer.getFullYear() + '_' +
                    ('0' + (serialNumer.getMonth()+1)).slice(-2) + '_' +
                    ('0' + serialNumer.getDate()).slice(-2);

      FileSaver.saveAs(blob, 'ubereats_image_' + zipName + '_' + serialNumer + '.zip');

    },(err) => {

      console.log('-- image zip error');

    });

  }

  handleDownloadAllImages(){

    // TODO if we keep a warning here, use the material ui dialog
    // const confirmDownloadAll = confirm('Do you want to zip all the images into one file and download?');
    // if (confirmDownloadAll === true) {

    let zip = new JSZip();

    // Add an top-level text file with contents
    zip.file('README.txt', 'Hello UberEats World!\nThank you for using the the UberEats Automatic Image Maker\nMore things to come - stay tuned!');

    // Generate a directory within the Zip file structure
    let img = zip.folder('images');

    // Add a file to the directory, in this case an image with data URI as contents - example img.file("smile.gif", imgData, {base64: true});

    this.state.imageFlavors.forEach((imageFlavor, i) => {

      if (imageFlavor.selected){

        let tBase64 = imageFlavor.b64.replace(/^data:image\/png;base64,/, '').replace(/^data:image\/jpg;base64,/, '');

        img.file(imageFlavor.fileName, tBase64, {base64: true} );

      }

    });

    zip.generateAsync({type:'blob'}).then((blob) => {

      let serialNumer = new Date();
      serialNumer = serialNumer.getFullYear() + '_' +
                    ('0' + (serialNumer.getMonth()+1)).slice(-2) + '_' +
                    ('0' + serialNumer.getDate()).slice(-2);

      let overlayName = this.state.globalOverlay ? ('_' + this.state.globalOverlay) : '';

      FileSaver.saveAs(blob, 'ubereats_images_' + this.state.image.original.name + overlayName + '_' + serialNumer + '.zip');

    }, (err) => {

      alert('Error compressing files, if this persists please notify admin');

    });

    // }

  }

  isDownloadAllButtonReady(){

    /*
      determine if download all button should be shown
      shown is true when downloadable images is greater than 1
    */

    let numOfDownloadable = 0; // define the number of downloadable images, always start back at 0

    this.state.imageFlavors.map((imageFlavor, i) => { // loop thru the flavors
      if (imageFlavor.image){
        numOfDownloadable++; // increase number of downloadable if this flavor is downloadable
      }
    });

    return numOfDownloadable > 1 ? true : false; // return true if more than one downloadable image

  }

  getBase64Image(img) {
    let canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    let ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0); // x,y offset where to start drawing - always 0,0
    return canvas.toDataURL();
  }

  /* Visual Logic - the things that make other things show and hide */
  setAvatarEditorRef(editor, i){

    const imageFlavor = this.state.imageFlavors[i];

    if (editor) imageFlavor.editor = editor;

  }
  /* Poppers Functions
    TODO: TECH_DEBT: These should be consolidated into a single function (or 2)  - this is easier for now
    */

  // handle globalOverlays popper
  handleGlobalOverlaysPopperOpen(){
    this.setState({ globalOverlaysPopperOpen: !this.state.globalOverlaysPopperOpen });
  };
  handleGlobalOverlaysPopperClose(){
    if (!this.state.globalOverlaysPopperOpen) {
      return;
    }
    // setTimeout to ensure a close event comes after a target click event
    this.timeout = setTimeout(() => {
      this.setState({ globalOverlaysPopperOpen: false });
    });
  };

  //
  handleIndividualOverlayPopperOpen(){
    this.setState({ individualOverlayPopperOpen: !this.state.individualOverlayPopperOpen });
  }
  handleIndividualOverlayPopperClose(){
    if (!this.state.individualOverlayPopperOpen) {
      return;
    }
    // setTimeout to ensure a close event comes after a target click event
    this.timeout = setTimeout(() => {
      this.setState({ individualOverlayPopperOpen: false });
    });
  }

  // handle Flavors popper
  handleFlavorsPopperOpen(){
    this.setState({ flavorsPopperOpen: !this.state.flavorsPopperOpen });
  };
  handleFlavorsPopperClose(){
    if (!this.state.flavorsPopperOpen) {
      return;
    }
    // setTimeout to ensure a close event comes after a target click event
    this.timeout = setTimeout(() => {
      this.setState({ flavorsPopperOpen: false });
    });
  };

  // handle ImageTypes popper
  handleImageTypesPopperOpen(){
    this.setState({ imageTypesPopperOpen: !this.state.imageTypesPopperOpen });
  };
  handleImageTypesPopperClose(){
    if (!this.state.imageTypesPopperOpen) {
      return;
    }
    // setTimeout to ensure a close event comes after a target click event
    this.timeout = setTimeout(() => {
      this.setState({ imageTypesPopperOpen: false });
    });
  };

  render(props) {

    const { title, intro, entries } = props;

    const { globalOverlaysPopperOpen, flavorsPopperOpen, imageTypesPopperOpen, individualOverlayPopperOpen } = this.state;

    return (
      <div className='image-automator'>

        <style dangerouslySetInnerHTML={{__html: `
          .uebp-button.uebp-button--scroll-up{display:none}
        ` }} />


        <div>

          {/* Hidden Uploader input */}
          <input
            type="file"
            accept="image/gif, image/jpeg, image/png"
            ref={(fileUpload) => { this.fileUpload = fileUpload; }}
            className={'hidden-input'}
            onChange={(event) => {this.handleUploadImage(event);}} />

          {/* Top Toolbar */}
          <AppBar className={'top-toolbar'}>
            <Toolbar className={'top-toolbar-bar'}>
              <ExpansionPanel
                className={'top-toolbar-expansion'}
                disabled={this.state.image.original.data ? false : true}
                expanded={this.state.expanded}>

                <ExpansionPanelSummary className={'top-toolbar-expansion-summary'}>

                  {/* Menu & Title */}
                  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                    <img className={'logo'} src={'https://images.ctfassets.net/we2lu90gv36e/6l7LH5hPocAOu4IQY6iUSe/819516de660de6a9e46215c1053097a3/Logo_Two_Color_On_Color_1.png'} />
                    <Typography className={'headline'}>
                      {title ? title : 'The Image Automator'}
                    </Typography>
                  </div>

                  <div>
                    {this.state.image.original.data ? (
                      <div>
                        <IconButton
                          className={'upload-again-button'}>
                          <FileUpload />
                        </IconButton>
                        <input
                          className={'hidden-input'}
                          ref={(fileUploadMoreButton) => { this.fileUploadMoreButton = fileUploadMoreButton; }}
                        />
                      </div>
                    ) : (
                      ''
                    )}
                  </div>

                </ExpansionPanelSummary>

                <ExpansionPanelDetails className={'top-toolbar-expansion-details'}>

                  <div className={'dragon_drop-wrapper'}>
                    <DropToUpload
                      className={'dragon_drop'}
                      onDrop={(event) => {this.handleUploadImage(event);}}
                      onOver={(event) => {this.handleDragonDropOnOver(event);}}
                      onLeave={(event) => {this.handleDragonDropOnLeave(event);}}
                      accept="image/gif, image/jpeg, image/png"
                    >
                      <div className={'dragon_drop-inner_card'} onClick={() => this.fileUpload.click()}>
                        <div className={'dragon_drop-hero'}>
                          <FileUpload />
                        </div>
                        <h2>{intro ? intro : 'Feed me a delicious image'}</h2>
                        <p>Drag and Drop</p>
                        <p>-or-</p>
                        <Button
                          className={'browse-button button'}
                          variant="raised">
                          Browse Files
                        </Button>
                      </div>
                    </DropToUpload>
                  </div>
                </ExpansionPanelDetails>

              </ExpansionPanel>
            </Toolbar>
          </AppBar>

          {/* Cards */}
          <div className={classNames('flavor_card-container', { 'flavor_card-container--full-screen' : this.state.image.original.data })}>

            {/* Cards || Upload Screen */}
            {this.state.image.original.data ?

              /* Flavor Cards */
              this.state.imageFlavors.map( (imageFlavor, i) => (
                imageFlavor.selected ?

                  <Card className="flavor_card">

                    <CardHeader
                      className={'flavor_card-header'}
                      avatar={
                        <Avatar
                          className={'flavor_card-header-avatar'}>
                          {imageFlavor.typeLogo && <img src={imageFlavor.typeLogo}/>}
                        </Avatar>
                      }
                      title={
                        <Typography
                          className={'flavor_card-header-title'}>
                          {imageFlavor.title}
                        </Typography>
                      }
                      subheader={
                        <Typography
                          className={'flavor_card-header-subheader'}>
                          {imageFlavor.image ? '"' + imageFlavor.fileName + '"' : ''}
                        </Typography>
                      }
                    />

                    <div className={'flavor_card-media-wrapper'}>
                      <CardMedia
                        id={imageFlavor.id}
                        className={'card-media'}
                        component={'img'}
                        width={imageFlavor.dims.width}
                        height={imageFlavor.dims.height}
                        image={'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='} // this is a blank base64 image - this thing wants a src image always - it quickly gets replaced by real content
                      />
                    </div>

                    <CardActions
                      className="flavor_card-actions"
                      onClick={() => {this.handleEditorOpenClose(i);}}
                      ondblclick={() => {this.handleEditorOpenClose(i);}}>
                      <IconButton
                        className={'flavor_card-actions_button'}>
                        <Edit className={'flavor_card-actions_button-icon'}/>
                        <Typography
                          className={'flavor_card-actions_button-label'}>
                            Edit Photo
                        </Typography>
                      </IconButton>

                    </CardActions>

                  </Card>
                  :
                  /* Flavor not selected */
                  ''
              ))
              :
              /* Dragon Drop - Upload an image */
              <div className={'dragon_drop-wrapper'}>
                <DropToUpload
                  className={'dragon_drop'}
                  onDrop={(event) => {this.handleUploadImage(event);}}
                  onOver={(event) => {this.handleDragonDropOnOver(event);}}
                  onLeave={(event) => {this.handleDragonDropOnLeave(event);}}
                  accept="image/gif, image/jpeg, image/png"
                >
                  <div className={'dragon_drop-inner_card'} onClick={() => this.fileUpload.click()}>
                    <div className={'dragon_drop-hero'}>
                      <FileUpload />
                    </div>
                    <h2>{intro ? intro : 'Feed me a delicious image'}</h2>
                    <p>Drag and Drop</p>
                    <p>-or-</p>
                    <Button
                      className={'browse-button button'}
                      variant="raised">
                      Browse Files
                    </Button>
                  </div>
                </DropToUpload>
              </div>
            }

          </div>

          {/* Bottom Toolbar */}
          {this.state.image.original.data ? (
            <AppBar className={'bottom-toolbar'}>
              <Toolbar className={'toolbar'}>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'white'}}>

                  {/* Global Overlays Options */}
                  <Manager className={'global_option overlay_color'}>
                    <Target>
                      <IconButton
                        className={'global_option-icon_button'}
                        aria-label="Global Overlays"
                        aria-owns={globalOverlaysPopperOpen ? 'global-overlay-menu-list' : null}
                        aria-haspopup="true"
                        onClick={() => {this.handleGlobalOverlaysPopperOpen();}}>
                        <span
                          style={{backgroundColor: this.state.globalOverlayColors[this.state.globalOverlay]}}
                          className={'global_option-icon'}>
                        </span>
                        <ArrowDropDown className={'global_option-icon--arrow'}/>
                      </IconButton>
                    </Target>
                    <Popper
                      style={{zIndex: 1}}
                      placement="bottom-start"
                      className={classNames({ 'no-pointer' : !globalOverlaysPopperOpen })}
                      eventsEnabled={globalOverlaysPopperOpen}>
                      <ClickAwayListener onClickAway={() => {this.handleGlobalOverlaysPopperClose();}}>
                        <Grow in={globalOverlaysPopperOpen} id="global-overlay-menu-list" style={{ transformOrigin: '0 0 0' }}>
                          <Paper>
                            <MenuList
                              className={'global_option-menu'}
                              role="menu">
                              {this.state.globalOverlayFlavors.map( (overlayFlavor, i) => (
                                <MenuItem
                                  className={'global_option-menu-list_item'}
                                  value={overlayFlavor}
                                  onClick={(event) => {this.handleGlobalOverlaysChange(event, overlayFlavor);}}
                                  selected={overlayFlavor === this.state.globalOverlay ? true : false}>
                                  <span
                                    style={{backgroundColor: this.state.globalOverlayColors[overlayFlavor]}}
                                    className={'global_option-menu-list_item-avatar_dot overlay_color'}>
                                  </span>
                                  {overlayFlavor}
                                </MenuItem>
                              ))}
                            </MenuList>
                          </Paper>
                        </Grow>
                      </ClickAwayListener>
                    </Popper>
                  </Manager>

                  {/* Image Flavors Choices */}
                  <Manager className={'global_option flavor_choices'}>
                    <Target>
                      <IconButton
                        className={'global_option-icon_button'}
                        aria-owns={flavorsPopperOpen ? 'flavors-menu-list' : null}
                        aria-haspopup="true"
                        onClick={() => {this.handleFlavorsPopperOpen();}}>
                        <PlaylistAddCheck />
                        <ArrowDropDown className={'global_option-icon--arrow'}/>
                      </IconButton>

                    </Target>
                    <Popper
                      style={{zIndex: 1}}
                      placement="bottom-start"
                      className={classNames({ 'no-pointer' : !flavorsPopperOpen })}
                      eventsEnabled={flavorsPopperOpen}>
                      <ClickAwayListener onClickAway={() => {this.handleFlavorsPopperClose();}}>
                        <Grow in={flavorsPopperOpen} id="flavors-menu-list" style={{ transformOrigin: '0 0 0' }}>
                          <Paper>
                            <MenuList
                              className={'overlay_color-menu'}
                              role="menu">
                              {this.state.imageFlavors.map( (flavor, i) => (
                                <MenuItem
                                  className={'global_option-menu-list_item'}
                                  selected={flavor.selected}
                                  onClick={(event) => {this.handleFlavorChoices(event, i);}}>

                                  <Avatar
                                    className={'global_option-menu-list_item-avatar_dot'}>
                                    {flavor.typeLogo && <img src={flavor.typeLogo}/>}
                                  </Avatar>
                                  <Typography
                                    className={'global_option-menu-list_title'}>
                                    {flavor.title}
                                  </Typography>

                                </MenuItem>
                              ))}
                            </MenuList>
                          </Paper>
                        </Grow>
                      </ClickAwayListener>
                    </Popper>
                  </Manager>

                  {/* File Type Options */}
                  <Manager className={'global_option file_types'}>
                    <Target>
                      <IconButton
                        className={'global_option-icon_button'}
                        aria-owns={imageTypesPopperOpen ? 'img-types-menu-list' : null}
                        aria-haspopup="true"
                        onClick={() => {this.handleImageTypesPopperOpen();}}>
                        <Attachment />
                        <ArrowDropDown className={'global_option-icon--arrow'}/>
                      </IconButton>

                    </Target>
                    <Popper
                      placement="bottom-start"
                      className={classNames({ 'no-pointer' : !imageTypesPopperOpen })}
                      eventsEnabled={imageTypesPopperOpen}>
                      <ClickAwayListener onClickAway={() => {this.handleImageTypesPopperClose();}}>
                        <Grow in={imageTypesPopperOpen} id="img-types-menu-list" style={{ transformOrigin: '0 0 0' }}>
                          <Paper>
                            <MenuList
                              className={'overlay_color-menu'}
                              role="menu">
                              {this.state.imageTypeOptions.map( (type, i) => (
                                <MenuItem
                                  className={'global_option-menu-list_item'}
                                  value={type}
                                  onClick={() => {this.handleGlobalImageType(type);}}
                                  selected={type === this.state.imageType ? true : false}>
                                  .{type}
                                </MenuItem>
                              ))}
                            </MenuList>
                          </Paper>
                        </Grow>
                      </ClickAwayListener>
                    </Popper>
                  </Manager>

                  {/* Global Rotate Options */}
                  <div className={'global_option rotate'}>
                    <IconButton
                      className={'global_option-icon_button'}
                      onClick={() => {this.handleGlobalRotate();}}>
                      <CropRotate/>
                    </IconButton>

                  </div>

                </div>


                <div>
                  <Button
                    variant="raised"
                    className={'button'}
                    onClick={(event) => {this.handleDownloadAllImages(event);}}>
                    Download All&nbsp;&nbsp;<FileDownload />
                  </Button>
                </div>


              </Toolbar>
            </AppBar>
          ) : (
            ''
          )}

          {/* Editor (Dialog)*/}
          {this.state.imageFlavors.map( (imageFlavor, i) => (

            <Dialog
              className={'image-automator-editor-window'}
              hideBackdrop={false}
              open={imageFlavor.editorOpen}
              onClose={() => {this.handleEditorOpenClose(i, 'close');}}>

              {/* Floating Close Button */}
              <IconButton
                className={'close-image-automator-editor-window'}
                color="inherit"
                onClick={() => {this.handleEditorOpenClose(i, 'close');}}
                aria-label="Close">
                <Close />
              </IconButton>

              {/* Header */}
              <div
                className={'header'}>

                <div style={{display: 'flex'}}>

                  <Avatar className={'avatar'}>
                    {imageFlavor.typeLogo && <img src={imageFlavor.typeLogo}/>}
                  </Avatar>

                  <div style={{paddingLeft: '8px'}}>

                    <Typography
                      className={'editor-headline'}
                      variant="title"
                      color="inherit">
                      {imageFlavor.title}
                    </Typography>

                    <Typography
                      className={'editor-filename'}>
                      {imageFlavor.fileName}
                    </Typography>

                  </div>

                </div>

                <Button
                  variant="raised"
                  className={'save-button button'}
                  color="inherit"
                  onClick={() => {this.handleEditorSave(i);}}>
                  Update
                </Button>

              </div>

              {/* Row */}
              <div className={'row'}>
                <div className={'col left'}>

                  {/* Device Preview */}
                  <div className={'iphone-device'}>
                    <img
                      src={imageFlavor.b64}
                      id={imageFlavor.id + '-device-preview'}
                    />
                  </div>

                </div>
                <div className={'col right'}>

                  {/* Preview */}
                  <div
                    className="overlay_preview--container">

                    {/* Preview of Overlay (if overlay) */}
                    {imageFlavor.useOverlay === false ? '' :
                      <img
                        className="overlay_preview"
                        src={ imageFlavor.useOverlay === 'matcha' ? imageFlavor.overlay.matcha :
                          imageFlavor.useOverlay === 'poke' ? imageFlavor.overlay.poke :
                            imageFlavor.useOverlay === 'fig' ? imageFlavor.overlay.fig :
                              imageFlavor.useOverlay === 'figMatcha' ? imageFlavor.overlay.figMatcha : '' }
                        width={imageFlavor.dims.width}
                        height={imageFlavor.dims.height}
                      />
                    }

                    {/* The Editor */}
                    <AvatarEditor
                      onDrop={null}
                      ref={(event) => {this.setAvatarEditorRef(event, i);}}
                      image={this.state.image.original.data}
                      width={imageFlavor.dims.width}
                      height={imageFlavor.dims.height}
                      color={[255, 0, 0, 0.6]} // RGBA
                      scale={imageFlavor.dims.scale}
                      rotate={0}
                      border={0}
                      position={imageFlavor.dims.position}
                      onPositionChange={(event) => {this.handleEditorPositionChange(event, i);}}
                      onLoadSuccess={(imgInfo) => {this.handleEditorLoadSuccess(imgInfo, i);}}
                      onMouseUp={() => {this.buildImageFlavorDevicePreview(imageFlavor);}}
                      style={{
                        maxWidth: '100%',
                        height: 'auto',
                        margin: '0 auto',
                        display: 'block',
                        cursor: 'move'
                      }}
                    />
                  </div>

                  {/* You're a Tool....bar */}
                  <Toolbar className={'editor-tools'}>

                    <ToolbarGroup style={{width: '100%'}}>

                      {/* Scale Slider */}
                      <Slider
                        min={1}
                        max={2}
                        step={0.001}
                        value={imageFlavor.dims.scale}
                        onChange={(event, value) => {this.handleImageScale(event, value, i);}}
                        onAfterChange={(event, value) => {this.buildImageFlavorDevicePreview(imageFlavor);}}
                      />

                    </ToolbarGroup>

                  </Toolbar>



                </div>
              </div>

            </Dialog>

          ))}

        </div>
      </div>
    );
  }

}
